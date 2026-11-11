import { MAX_CONSECUTIVE_DOUBLES, rollDice } from '@goose/engine'
import type { Rng, Seat } from '@goose/engine'
import { Room } from './room.js'
import { makeRoomCode } from './room-code.js'

export type Clock = {
  now(): number
  setTimeout(fn: () => void, ms: number): symbol
  clearTimeout(handle: symbol): void
}

export type ManagerDeps = {
  clock: Clock
  rng: Rng
  onView: (code: string) => void
  /** Rooms held at once, whoever created them. */
  maxRooms?: number
  /** Rooms one owner (a client IP) may hold at once. Unlimited when omitted. */
  maxRoomsPerOwner?: number
}

/** The owner already holds its share of rooms; the socket layer answers rate_limited. */
export class TooManyRoomsError extends Error {
  constructor() {
    super('too many tables from this address')
  }
}

export const TURN_TIMEOUT_MS = 60_000
export const DISCONNECT_GRACE_MS = 90_000
export const MAX_ROOMS = 500

type Entry = {
  room: Room
  turnTimer: symbol | null
  graceTimers: Map<Seat, symbol>
  /* sessionId -> seat. Room keeps no session bookkeeping of its own (it is
     not part of what a client is allowed to see), so the manager owns it. */
  sessions: Map<string, Seat>
}

export function systemClock(): Clock {
  const handles = new Map<symbol, NodeJS.Timeout>()
  return {
    now: () => Date.now(),
    setTimeout(fn, ms) {
      const handle = Symbol('timer')
      const native = setTimeout(() => {
        handles.delete(handle)
        fn()
      }, ms)
      handles.set(handle, native)
      return handle
    },
    clearTimeout(handle) {
      const native = handles.get(handle)
      if (native !== undefined) {
        clearTimeout(native)
        handles.delete(handle)
      }
    },
  }
}

export class RoomManager {
  #deps: ManagerDeps
  #rooms = new Map<string, Entry>()
  /** Who created each room, and how many each owner holds, until the room is dropped. */
  #ownerOf = new Map<string, string>()
  #ownedCount = new Map<string, number>()

  constructor(deps: ManagerDeps) {
    this.#deps = deps
  }

  create(name: string, sessionId: string, owner: string | null = null): string {
    if (this.#rooms.size >= (this.#deps.maxRooms ?? MAX_ROOMS))
      throw new Error('the server is full')
    const owned = owner === null ? 0 : (this.#ownedCount.get(owner) ?? 0)
    if (owned >= (this.#deps.maxRoomsPerOwner ?? Number.POSITIVE_INFINITY)) {
      throw new TooManyRoomsError()
    }
    let code = makeRoomCode()
    while (this.#rooms.has(code)) code = makeRoomCode()
    const room = new Room(code)
    const seat = room.join(name, sessionId)
    const entry: Entry = {
      room,
      turnTimer: null,
      graceTimers: new Map(),
      sessions: new Map([[sessionId, seat]]),
    }
    this.#rooms.set(code, entry)
    if (owner !== null) {
      this.#ownerOf.set(code, owner)
      this.#ownedCount.set(owner, owned + 1)
    }
    this.#deps.onView(code)
    return code
  }

  join(code: string, name: string, sessionId: string): Seat {
    const entry = this.#require(code)
    const seat = entry.room.join(name, sessionId)
    // A reused seat's old session must not reconnect into it.
    for (const [session, held] of entry.sessions) if (held === seat) entry.sessions.delete(session)
    entry.sessions.set(sessionId, seat)
    this.#deps.onView(code)
    return seat
  }

  start(code: string, seat: Seat): void {
    const entry = this.#require(code)
    entry.room.start(seat)
    this.#skipLeftSeats(entry)
    this.#armTurnTimer(code, entry)
    this.#deps.onView(code)
  }

  /* Through the manager, not the room, so the new game gets a turn clock: the
     old one stopped arming when the last game ended. */
  restart(code: string, seat: Seat): void {
    const entry = this.#require(code)
    entry.room.restart(seat)
    this.#clearTurnTimer(entry)
    this.#skipLeftSeats(entry)
    this.#armTurnTimer(code, entry)
    this.#deps.onView(code)
  }

  /* A roll that actually happens in time needs no further enforcement: it
     proves someone is at the table. It only rearms a timer if the seat it
     hands off to turns out to be 'left', in which case nobody will ever roll
     for it and the manager has to keep going on its own. */
  roll(code: string, seat: Seat): void {
    const entry = this.#require(code)
    this.#clearTurnTimer(entry)
    this.#resolveRoll(entry, seat)
    if (this.#skipLeftSeats(entry)) this.#armTurnTimer(code, entry)
    this.#deps.onView(code)
  }

  disconnect(code: string, seat: Seat): void {
    const entry = this.#require(code)
    this.#clearGrace(entry, seat)
    entry.room.setPresence(seat, 'disconnected')
    const timer = this.#deps.clock.setTimeout(() => this.#expire(code, seat), DISCONNECT_GRACE_MS)
    entry.graceTimers.set(seat, timer)
    this.#deps.onView(code)
  }

  reconnect(code: string, sessionId: string): Seat {
    const entry = this.#require(code)
    const seat = entry.sessions.get(sessionId)
    if (seat === undefined) throw new Error('no seat for this session in this room')
    this.#clearGrace(entry, seat)
    entry.room.setPresence(seat, 'active')
    this.#deps.onView(code)
    return seat
  }

  /* Given up on purpose, so no grace: nobody is coming back to it. */
  leave(code: string, seat: Seat): void {
    const entry = this.#require(code)
    this.#clearGrace(entry, seat)
    this.#markLeft(code, entry, seat)
  }

  /** The seat a session holds at this table, if any. */
  seatOf(code: string, sessionId: string): Seat | undefined {
    return this.#rooms.get(code)?.sessions.get(sessionId)
  }

  get(code: string): Room | undefined {
    return this.#rooms.get(code)?.room
  }

  #require(code: string): Entry {
    const entry = this.#rooms.get(code)
    if (!entry) throw new Error(`no room with code ${code}`)
    return entry
  }

  #resolveRoll(entry: Entry, seat: Seat): void {
    const view = entry.room.view(seat)
    if (view.turn.seat !== seat) throw new Error("it is not this seat's turn")
    const dieCount = view.config.twoDice ? 2 : 1
    const dice = rollDice(this.#deps.rng, dieCount)
    entry.room.roll(seat, dice)
  }

  /* The seat is gone for good: if it is its turn right now, resolve it
     immediately instead of waiting out a turn timer nobody will ever cancel. */
  #expire(code: string, seat: Seat): void {
    const entry = this.#rooms.get(code)
    if (!entry) return
    entry.graceTimers.delete(seat)
    this.#markLeft(code, entry, seat)
  }

  #markLeft(code: string, entry: Entry, seat: Seat): void {
    entry.room.setPresence(seat, 'left')
    if (entry.room.abandoned) {
      this.#drop(code, entry)
      return
    }
    if (entry.room.phase === 'playing' && entry.room.view(entry.room.hostSeat).turn.seat === seat) {
      this.#clearTurnTimer(entry)
      this.#skipLeftSeats(entry)
      this.#armTurnTimer(code, entry)
    }
    this.#deps.onView(code)
  }

  /* Rooms were never removed, so every table ever opened stayed in memory.
     Only once nobody can come back: a disconnected seat still has its grace. */
  #drop(code: string, entry: Entry): void {
    this.#clearTurnTimer(entry)
    for (const grace of entry.graceTimers.values()) this.#deps.clock.clearTimeout(grace)
    entry.graceTimers.clear()
    this.#rooms.delete(code)
    this.#releaseOwner(code)
  }

  /** Gives a dropped room back to its owner's allowance; the count is dropped at zero. */
  #releaseOwner(code: string): void {
    const owner = this.#ownerOf.get(code)
    if (owner === undefined) return
    this.#ownerOf.delete(code)
    const left = (this.#ownedCount.get(owner) ?? 1) - 1
    if (left > 0) this.#ownedCount.set(owner, left)
    else this.#ownedCount.delete(owner)
  }

  #clearGrace(entry: Entry, seat: Seat): void {
    const grace = entry.graceTimers.get(seat)
    if (grace === undefined) return
    this.#deps.clock.clearTimeout(grace)
    entry.graceTimers.delete(seat)
  }

  /* The timer fired: the seat on turn did not act in time, so the manager
     rolls for it. Always keeps the enforcement chain going afterwards. */
  #autoRoll(code: string): void {
    const entry = this.#rooms.get(code)
    if (!entry || entry.room.phase !== 'playing') return
    const seat = entry.room.view(entry.room.hostSeat).turn.seat
    this.#resolveRoll(entry, seat)
    this.#skipLeftSeats(entry)
    this.#armTurnTimer(code, entry)
    this.#deps.onView(code)
  }

  /* Rolls on behalf of every consecutive seat marked 'left': nobody will
     ever act for them, so waiting out a timer for each one only delays the
     table. Bounded at one full lap so a table abandoned by everyone still
     arms a timer instead of spinning forever. Returns whether it resolved
     at least one seat, so a caller that must not arm a timer on an ordinary
     turn (a prompt manual roll) only does so when this actually fired.

     A lap is longer than the seat count: the doubles house rule can hand the
     same seat up to MAX_CONSECUTIVE_DOUBLES rolls before the turn moves on,
     and a bound of one roll per seat would leave a 'left' seat still holding
     the turn when the loop gave up. */
  #skipLeftSeats(entry: Entry): boolean {
    let skipped = false
    const cap = entry.room.seatCount * MAX_CONSECUTIVE_DOUBLES
    for (let hops = 0; hops <= cap; hops++) {
      if (entry.room.phase !== 'playing') break
      const view = entry.room.view(entry.room.hostSeat)
      const seat = view.turn.seat
      if (view.seats[seat]?.presence !== 'left') break
      this.#resolveRoll(entry, seat)
      skipped = true
    }
    return skipped
  }

  #armTurnTimer(code: string, entry: Entry): void {
    if (entry.room.phase !== 'playing') return
    entry.turnTimer = this.#deps.clock.setTimeout(() => this.#autoRoll(code), TURN_TIMEOUT_MS)
  }

  #clearTurnTimer(entry: Entry): void {
    if (entry.turnTimer !== null) {
      this.#deps.clock.clearTimeout(entry.turnTimer)
      entry.turnTimer = null
    }
  }
}
