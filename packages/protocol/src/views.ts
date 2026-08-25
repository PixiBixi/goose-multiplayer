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
  'freed',
  'escape',
  'escapeFailed',
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
  /* The countdown the seat plate reads out. Turns this seat has left in the
     trap before the cap lets it go, `null` when the table sets no cap and the
     only way out is somebody else. Computed by the server: a plate that
     subtracted a config field from a state field would be the client working
     out a rule for itself. */
  blockedTurnsLeft: number | null
  /* Whether those turns are attempts or waits. A seat that rolls for its
     freedom is doing something, and the plate says so: "encore 2 essais"
     rather than "encore 2 tours". */
  blockedTrying: boolean
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
  /* The version the SERVER is running, stamped by cog and read from the
     changelog. The client compares it with the version its own bundle was
     built as: they differ exactly when the tab has been left open across a
     deploy, which is the moment the client starts receiving things it has
     never heard of. Do NOT make it optional to save a byte: absent and equal
     are not the same answer. */
  version: string
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
