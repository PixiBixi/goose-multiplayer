import type { BlockReason, Move, Seat, Square, Step, TableConfig } from '@goose/engine'

export type Presence = 'active' | 'disconnected' | 'left'

export type SeatView = {
  seat: Seat
  name: string
  presence: Presence
  position: Square
  blocked: BlockReason | null
  skipTurns: number
  colour: string
  handCount?: number
}

export type ChatLine = {
  seat: Seat | null
  name: string
  text: string
  at: number
}

export type TableView = {
  code: string
  phase: 'lobby' | 'playing' | 'over'
  config: TableConfig
  you: { seat: Seat; name: string }
  host: Seat
  seats: SeatView[]
  turn: { seat: Seat; legalMoves: Move[]; deadlineAt: number | null }
  lastTurn: { seat: Seat; dice: number[]; steps: Step[] } | null
  winner: Seat | null
  ranking: Seat[]
  chat: ChatLine[]
}
