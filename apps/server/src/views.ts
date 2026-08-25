import { legalMoves, ranking as computeRanking } from '@goose/engine'
import type { GameState, Seat, Step, TableConfig } from '@goose/engine'
import type { ChatLine, Presence, SeatView, TableView } from '@goose/protocol'

export type Member = {
  name: string
  sessionId: string
  presence: Presence
}

export type LastTurn = { seat: Seat; dice: number[]; steps: Step[] } | null

export type ViewInput = {
  code: string
  phase: TableView['phase']
  config: TableConfig
  hostSeat: Seat
  members: Member[]
  game: GameState | null
  lastTurn: LastTurn
  chat: ChatLine[]
}

/* Six seats, six colours, picked to stay distinguishable at a glance on the
   board. Cycled defensively: MAX_SEATS already caps membership at six. */
const SEAT_COLOURS = ['#e63946', '#2a9d8f', '#457b9d', '#f4a261', '#8338ec', '#ffb703']

export function buildView(input: ViewInput, forSeat: Seat): TableView {
  const { code, phase, config, hostSeat, members, game, lastTurn, chat } = input
  const you = members[forSeat]
  if (!you) throw new Error(`no seat ${forSeat} in this room`)

  const seats: SeatView[] = members.map((member, seat) => ({
    seat,
    name: member.name,
    presence: member.presence,
    position: game?.positions[seat] ?? 0,
    blocked: game?.blocked[seat] ?? null,
    skipTurns: game?.skipTurns[seat] ?? 0,
    colour: SEAT_COLOURS[seat % SEAT_COLOURS.length] ?? '#000000',
  }))

  return {
    code,
    phase,
    config,
    you: { seat: forSeat, name: you.name },
    host: hostSeat,
    seats,
    turn: {
      seat: game?.turn ?? hostSeat,
      legalMoves: game ? legalMoves(game, forSeat) : [],
      /* Room is synchronous and owns no clock: RoomManager is the only thing
         that knows a deadline, and it reads its own timer, not this view. */
      deadlineAt: null,
    },
    lastTurn,
    winner: game?.winner ?? null,
    ranking: game ? computeRanking(game) : [],
    chat,
  }
}
