import type { GameState, Seat, TableConfig } from './types.js'

export const MIN_SEATS = 2
export const MAX_SEATS = 6

export const DEFAULT_CONFIG: TableConfig = {
  exactFinish: true,
  twoDice: true,
  rescue: true,
  /* On by default: without it a 9 on the opening roll chains the geese
     9-18-27-36-45-54-63 and wins outright, in 4 of the 36 dice combinations.
     Do NOT flip it back off. See reducer-opening.test.ts. */
  opening9: true,
  /* On by default, and a house rule rather than a printed one: the game of
     the goose grants its re-rolls through the goose squares, not through the
     dice. Capped at three consecutive doubles by the reducer. */
  doubleAgain: true,
  /* The gentler of the two: the third double only passes the turn. A host who
     wants the punishing table picks 'restart'. */
  tripleDouble: 'pass',
  /* Three of the seat's own turns, then the trap lets go. Rescue alone was
     measured over 2000 games per format as an elimination rather than a
     setback: 56% of two player games ended with a seat still in the hole, 68%
     at four, 72% at six. Do NOT set this back to null by default. */
  maxBlockedTurns: 3,
  /* On by default, and the half of the fix that gives the blocked player
     something to DO: the seat rolls for its own freedom instead of watching.
     Needs twoDice, like opening9 and doubleAgain. */
  escapeOnDouble: true,
  mode: 'classic',
}

export function createGame(seatCount: number, config: Partial<TableConfig> = {}): GameState {
  if (!Number.isInteger(seatCount) || seatCount < MIN_SEATS || seatCount > MAX_SEATS) {
    throw new Error(`seat count must be an integer between ${MIN_SEATS} and ${MAX_SEATS}`)
  }
  const zeroes = (): number[] => Array.from({ length: seatCount }, () => 0)
  return {
    config: { ...DEFAULT_CONFIG, ...config },
    seatCount,
    positions: zeroes(),
    blocked: Array.from({ length: seatCount }, () => null),
    blockedTurns: zeroes(),
    skipTurns: zeroes(),
    consecutiveDoubles: 0,
    turn: 0 satisfies Seat,
    winner: null,
    finished: false,
  }
}
