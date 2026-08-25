import type { GameState, Seat } from './types.js'

/** Furthest along first. The winner always leads, even on an inexact finish. */
export function ranking(state: GameState): Seat[] {
  const seats = Array.from({ length: state.seatCount }, (_, i) => i)
  return seats.sort((a, b) => {
    if (a === state.winner) return -1
    if (b === state.winner) return 1
    return (state.positions[b] ?? 0) - (state.positions[a] ?? 0)
  })
}

/** A rematch at the same table: same seats, same rules, everything else fresh. */
export function restart(state: GameState): GameState {
  const zeroes = (): number[] => Array.from({ length: state.seatCount }, () => 0)
  return {
    ...state,
    positions: zeroes(),
    blocked: Array.from({ length: state.seatCount }, () => null),
    blockedTurns: zeroes(),
    skipTurns: zeroes(),
    consecutiveDoubles: 0,
    turn: 0,
    winner: null,
    finished: false,
  }
}
