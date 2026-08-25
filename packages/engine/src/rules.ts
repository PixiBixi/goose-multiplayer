import type { GameState, Move, Seat } from './types.js'

export function canAct(state: GameState, seat: Seat): boolean {
  return !state.finished && state.blocked[seat] === null
}

export function legalMoves(state: GameState, seat: Seat): Move[] {
  /* Thin on purpose in v1: there is exactly one thing to do on your turn.
     The shape is kept because phase 2 fills it with card plays, and the view
     and the wire do not have to change for that. */
  if (state.finished || state.turn !== seat) return []
  return canAct(state, seat) ? ['roll'] : []
}

/** The next seat that can act, or null when the table is deadlocked. */
export function nextSeat(state: GameState): Seat | null {
  for (let hop = 1; hop <= state.seatCount; hop++) {
    const candidate = (state.turn + hop) % state.seatCount
    if (state.blocked[candidate] === null) return candidate
  }
  return null
}
