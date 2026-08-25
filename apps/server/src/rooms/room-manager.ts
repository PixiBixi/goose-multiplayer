import { makeRng, rollDice } from '@goose/engine'
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
}

export const TURN_TIMEOUT_MS = 60_000
export const DISCONNECT_GRACE_MS = 90_000

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
  /* Room codes are cosmetic, not gameplay: they draw from their own rng so a
     table's dice sequence, and a same-seed replay of it, never depends on how
     many rooms this manager happened to create first. */
  #codeRng: Rng = makeRng(Date.now())

  constructor(deps: ManagerDeps) {
    this.#deps = deps
  }

  create(name: string, sessionId: string): string {
    let code = makeRoomCode(this.#codeRng)
    while (this.#rooms.has(code)) code = makeRoomCode(this.#codeRng)
    const room = new Room(code)
    const seat = room.join(name, sessionId)
    const entry: Entry = {
      room,
      turnTimer: null,
      graceTimers: new Map(),
      sessions: new Map([[sessionId, seat]]),
    }
    this.#rooms.set(code, entry)
    this.#deps.onView(code)
    return code
  }

  join(code: string, name: string, sessionId: string): Seat {
    const entry = this.#require(code)
    const seat = entry.room.join(name, sessionId)
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
    entry.room.setPresence(seat, 'disconnected')
    const timer = this.#deps.clock.setTimeout(() => this.#expire(code, seat), DISCONNECT_GRACE_MS)
    entry.graceTimers.set(seat, timer)
    this.#deps.onView(code)
  }

  reconnect(code: string, sessionId: string): Seat {
    const entry = this.#require(code)
    const seat = entry.sessions.get(sessionId)
    if (seat === undefined) throw new Error('no seat for this session in this room')
    const grace = entry.graceTimers.get(seat)
    if (grace !== undefined) {
      this.#deps.clock.clearTimeout(grace)
      entry.graceTimers.delete(seat)
    }
    entry.room.setPresence(seat, 'active')
    this.#deps.onView(code)
    return seat
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
    entry.room.setPresence(seat, 'left')
    if (entry.room.phase === 'playing' && entry.room.view(entry.room.hostSeat).turn.seat === seat) {
      this.#clearTurnTimer(entry)
      this.#skipLeftSeats(entry)
      this.#armTurnTimer(code, entry)
    }
    this.#deps.onView(code)
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
     turn (a prompt manual roll) only does so when this actually fired. */
  #skipLeftSeats(entry: Entry): boolean {
    let skipped = false
    for (let hops = 0; hops <= entry.room.seatCount; hops++) {
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
