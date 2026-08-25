/** 0 is the start, off the board. 1 to 63 are the printed squares. */
export type Square = number
export type Seat = number
export type BlockReason = 'well' | 'prison'

export type TableConfig = {
  exactFinish: boolean
  twoDice: boolean
  rescue: boolean
  opening9: boolean
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
  turn: Seat
  winner: Seat | null
  finished: boolean
  /* Phase 2 extension point. Absent in classic mode, and the server refuses
     the card actions while it is. Declared here so adding cards never means
     changing the shape of the state that crosses the wire. */
  hands?: never[]
}

export type Move = 'roll'
