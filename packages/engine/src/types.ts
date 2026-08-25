/** 0 is the start, off the board. 1 to 63 are the printed squares. */
export type Square = number
export type Seat = number
export type BlockReason = 'well' | 'prison'

/** What a third consecutive double costs the seat that rolled it. */
export type TripleDouble = 'pass' | 'restart'

export type TableConfig = {
  exactFinish: boolean
  twoDice: boolean
  rescue: boolean
  opening9: boolean
  /* A house rule with no historical basis: the printed game grants its
     re-rolls through the goose squares, never through the dice. */
  doubleAgain: boolean
  tripleDouble: TripleDouble
  mode: 'classic' | 'cards'
}

export type GameState = {
  config: TableConfig
  seatCount: number
  positions: Square[]
  blocked: (BlockReason | null)[]
  skipTurns: number[]
  /** Only the first roll can trigger the opening-nine rule. */
  hasRolled: boolean[]
  /* Doubles the seat on turn has rolled back to back. Lives in the state
     rather than in the caller so the cap survives a reconnect, and is reset
     the moment the turn passes. */
  consecutiveDoubles: number
  turn: Seat
  winner: Seat | null
  finished: boolean
  /* Phase 2 extension point. Absent in classic mode, and the server refuses
     the card actions while it is. Declared here so adding cards never means
     changing the shape of the state that crosses the wire. */
  hands?: never[]
}

export type Move = 'roll'

export type Step =
  | { kind: 'move'; from: Square; to: Square; by: number }
  | { kind: 'goose'; from: Square; to: Square; by: number }
  | { kind: 'bridge' | 'dice' | 'maze' | 'death'; from: Square; to: Square }
  | { kind: 'bounce'; from: Square; to: Square; overshoot: number }
  | { kind: 'blocked'; seat: Seat; at: Square; reason: BlockReason }
  | { kind: 'rescue'; seat: Seat; at: Square; to: Square }
  | { kind: 'skip'; seat: Seat; turns: number }
  | { kind: 'double'; seat: Seat; dice: number[] }
  | { kind: 'tripleDouble'; seat: Seat; outcome: TripleDouble; from: Square; to: Square }
  | { kind: 'win'; seat: Seat; at: number }
