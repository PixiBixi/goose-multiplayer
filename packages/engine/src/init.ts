import type { GameState, Seat, TableConfig } from './types.js'

export const MIN_SEATS = 2
export const MAX_SEATS = 6

export const DEFAULT_CONFIG: TableConfig = {
  exactFinish: true,
  twoDice: true,
  rescue: true,
  opening9: false,
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
