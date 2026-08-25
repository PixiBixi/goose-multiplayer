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
  /* How many of its own turns a seat spends in the well or the prison before
     the trap lets it go, whichever comes first with a rescue or an escaping
     double. `null` is the historic rule, rescue only, which measured as an
     elimination in the large majority of games: see the spec and
     scripts/measure-blocking.ts. Do NOT make `null` the default again. */
  maxBlockedTurns: number | null
  /* A blocked seat takes its turn and rolls for its freedom instead of being
     passed over, and a double opens the trap. Inert without `twoDice`: there
     is no double on one die, and a seat that cannot possibly succeed is
     passed over rather than made to roll. */
  escapeOnDouble: boolean
  mode: 'classic' | 'cards'
}

export type GameState = {
  config: TableConfig
  seatCount: number
  positions: Square[]
  blocked: (BlockReason | null)[]
  /* Turns this seat has already spent blocked, counted in its own turns:
     an escape attempt and a turn spent being passed over cost the same one.
     In the state and not in a timer, so it survives a reconnect and replays
     exactly. Reset to zero the moment the seat gets out, by any of the three
     doors. */
  blockedTurns: number[]
  skipTurns: number[]
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

/* Every rule that changes the game gets its own kind. A rule the client can
   only recognise by comparing squares, or by reading the table config, is a
   rule the client cannot name, and an unnamed rule is one the player is left
   to guess at. Do NOT fold a new rule back into `move`. */
export type Step =
  | { kind: 'move'; from: Square; to: Square; by: number }
  /* The opening nine is a placement, not an advance, and the destination
     depends on which pair made the nine. The dice travel with the step so the
     client can say why it went to 26 rather than to 53. */
  | { kind: 'opening9'; from: Square; to: Square; dice: number[] }
  | { kind: 'goose'; from: Square; to: Square; by: number }
  | { kind: 'bridge' | 'dice' | 'maze' | 'death'; from: Square; to: Square }
  | { kind: 'bounce'; from: Square; to: Square; overshoot: number }
  /* The mirror of `bounce`, for a table playing without the exact finish: the
     surplus is dropped instead of rebounding. Without it the move step reads
     as an ordinary advance that happens to stop on 63. */
  | { kind: 'overshoot'; from: Square; to: Square; overshoot: number }
  | { kind: 'blocked'; seat: Seat; at: Square; reason: BlockReason }
  /* `reason` is the trap the seat is walking out of. The square alone would
     make the client look 31 and 52 up on the board to tell them apart. */
  | { kind: 'rescue'; seat: Seat; at: Square; to: Square; reason: BlockReason }
  /* Out by waiting: the seat served `waited` of its own turns and the trap
     let it go. A different door from `rescue`, so a different kind: nobody
     took its place, and the client must be able to say which one opened. */
  | { kind: 'freed'; seat: Seat; at: Square; reason: BlockReason; waited: number }
  /* Out by rolling a double. The dice travel with the step because they are
     the reason, and the seat moves by them in the same turn. */
  | { kind: 'escape'; seat: Seat; at: Square; reason: BlockReason; dice: number[] }
  /* Tried for the double and missed. Without it the turn reads as if the seat
     had simply been skipped, and the player never sees that it played. */
  | { kind: 'escapeFailed'; seat: Seat; at: Square; reason: BlockReason; dice: number[] }
  | { kind: 'skip'; seat: Seat; turns: number }
  | { kind: 'double'; seat: Seat; dice: number[] }
  | { kind: 'tripleDouble'; seat: Seat; outcome: TripleDouble; from: Square; to: Square }
  /* Every remaining seat is blocked and the round ends with no winner. It is a
     rule of the spec, not an accident, so it says so rather than leaving the
     client to infer it from a null winner. */
  | { kind: 'deadlock' }
  | { kind: 'win'; seat: Seat; at: number }
