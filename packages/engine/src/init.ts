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
    turn: 0 satisfies Seat,
    winner: null,
    finished: false,
  }
}
