import {
  applyRoll,
  createGame,
  DEFAULT_CONFIG,
  MAX_SEATS,
  MIN_SEATS,
  restart as restartGame,
} from '@goose/engine'
import type { GameState, Seat, TableConfig } from '@goose/engine'
import type { ChatLine, Presence, TableView } from '@goose/protocol'
import type { LastTurn, Member } from '../views.js'
import { buildView } from '../views.js'

export type Phase = 'lobby' | 'playing' | 'over'

/* Oldest lines drop first once the log passes this length, so a long game's
   chat cannot grow the view without bound. */
const CHAT_LOG_CAP = 200

/* Synchronous and timer-free by design: Room never rolls dice and never
   schedules anything. RoomManager owns the clock and hands it the dice. */
export class Room {
  readonly code: string
  #members: Member[] = []
  #hostSeat: Seat = 0
  #config: TableConfig = { ...DEFAULT_CONFIG }
  #game: GameState | null = null
  #lastTurn: LastTurn = null
  #chat: ChatLine[] = []

  constructor(code: string) {
    this.code = code
  }

  get phase(): Phase {
    if (this.#game === null) return 'lobby'
    return this.#game.finished ? 'over' : 'playing'
  }

  get hostSeat(): Seat {
    return this.#hostSeat
  }

  get seatCount(): number {
    return this.#members.length
  }

  /** Nobody could come back: every seat has left for good. */
  get abandoned(): boolean {
    return this.#members.every((member) => member.presence === 'left')
  }

  get lastTurn(): LastTurn {
    return this.#lastTurn
  }

  join(name: string, sessionId: string): Seat {
    if (this.phase !== 'lobby') throw new Error('cannot join: the game has already started')
    /* A seat left in the lobby is handed on: nothing has been played yet, so
       seat == engine index holds, and keeping it let departures fill the table. */
    const vacant = this.#members.findIndex((member) => member.presence === 'left')
    if (vacant === -1 && this.#members.length >= MAX_SEATS) throw new Error('the room is full')
    const seat = vacant === -1 ? this.#members.length : vacant
    this.#members[seat] = { name, sessionId, presence: 'active' }
    this.#ensureHost()
    return seat
  }

  leave(seat: Seat): void {
    this.#assertSeat(seat)
    this.setPresence(seat, 'left')
  }

  setPresence(seat: Seat, presence: Presence): void {
    this.#assertSeat(seat)
    const member = this.#members[seat]
    if (!member) throw new Error(`no seat ${seat} in this room`)
    member.presence = presence
    this.#ensureHost()
  }

  configure(seat: Seat, patch: Partial<TableConfig>): void {
    this.#assertSeat(seat)
    if (seat !== this.#hostSeat) throw new Error('only the host can change the rules')
    if (this.phase !== 'lobby') {
      throw new Error('cannot change the rules: the game has already started')
    }
    this.#config = { ...this.#config, ...patch }
  }

  start(seat: Seat): void {
    this.#assertSeat(seat)
    if (seat !== this.#hostSeat) throw new Error('only the host can start the game')
    // A rematch goes through restart: a second start would wipe a game in progress.
    if (this.phase !== 'lobby') throw new Error('cannot start: the game has already started')
    if (this.#members.length < MIN_SEATS) throw new Error('need at least two seats to start')
    this.#game = createGame(this.#members.length, this.#config)
  }

  roll(seat: Seat, dice: number[]): void {
    if (this.#game === null) throw new Error('the game has not started')
    if (seat !== this.#game.turn) throw new Error("it is not this seat's turn")
    const expected = this.#game.config.twoDice ? 2 : 1
    if (dice.length !== expected) {
      throw new Error(`expected ${expected} ${expected === 1 ? 'die' : 'dice'}, got ${dice.length}`)
    }
    const { state, steps } = applyRoll(this.#game, dice)
    this.#game = state
    this.#lastTurn = { seat, dice, steps }
  }

  restart(seat: Seat): void {
    this.#assertSeat(seat)
    if (this.#game === null) throw new Error('the game has not started')
    // Any seat may ask, so only once it is over: mid-game it would wipe everybody's board.
    if (this.phase !== 'over') throw new Error('cannot restart: the game is not over')
    this.#game = restartGame(this.#game)
    this.#lastTurn = null
  }

  chat(seat: Seat, text: string): void {
    const member = this.#members[seat]
    if (!member) throw new Error(`no seat ${seat} in this room`)
    this.#chat.push({ seat, name: member.name, text, at: Date.now() })
    if (this.#chat.length > CHAT_LOG_CAP) {
      this.#chat.splice(0, this.#chat.length - CHAT_LOG_CAP)
    }
  }

  view(seat: Seat): TableView {
    return buildView(
      {
        code: this.code,
        phase: this.phase,
        config: this.#config,
        hostSeat: this.#hostSeat,
        members: this.#members,
        game: this.#game,
        lastTurn: this.#lastTurn,
        chat: this.#chat,
      },
      seat,
    )
  }

  /* The host alone can configure and start, so an absent host froze the lobby.
     Moved to the lowest active seat, and not handed back: a reload must not
     yank it from whoever is running the table now. Kept if nobody is active. */
  #ensureHost(): void {
    if (this.#members[this.#hostSeat]?.presence === 'active') return
    const next = this.#members.findIndex((member) => member.presence === 'active')
    if (next !== -1) this.#hostSeat = next
  }

  #assertSeat(seat: Seat): void {
    if (seat < 0 || seat >= this.#members.length) throw new Error(`no seat ${seat} in this room`)
  }
}
