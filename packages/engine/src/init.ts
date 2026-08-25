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
    skipTurns: zeroes(),
    hasRolled: Array.from({ length: seatCount }, () => false),
    consecutiveDoubles: 0,
    turn: 0 satisfies Seat,
    winner: null,
    finished: false,
  }
}
