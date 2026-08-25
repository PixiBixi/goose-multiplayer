import type { BlockReason, Move, Seat, Square, Step, TableConfig } from '@goose/engine'

export type Presence = 'active' | 'disconnected' | 'left'

/* Every kind of step the wire carries, listed once. The engine names a rule,
   this list acknowledges it, and the client switches on it: a rule added to
   the engine and forgotten here fails to compile rather than reaching a
   browser as a step nothing knows how to narrate. Do NOT widen the type to
   `string` to make an addition build. */
export const STEP_KINDS = [
  'move',
  'opening9',
  'goose',
  'bridge',
  'dice',
  'maze',
  'death',
  'bounce',
  'overshoot',
  'blocked',
  'rescue',
  'skip',
  'double',
  'tripleDouble',
  'deadlock',
  'win',
] as const satisfies readonly Step['kind'][]

export type StepKind = (typeof STEP_KINDS)[number]

/* The other half of the contract. `satisfies` above proves every listed kind
   is real; this is `never` exactly when every real kind is listed, and
   views.test.ts is where that gets asserted. Both directions, or the list
   drifts the moment a rule is added. */
export type UnlistedStepKind = Exclude<Step['kind'], StepKind>

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
