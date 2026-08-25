import type { GameState, Move, Seat } from './types.js'

/* Whether a blocked seat plays its turn instead of being passed over. Both
   halves matter: the rule can be off, and on one die there is no double to
   roll, so making the seat roll would be handing it a turn it cannot use. */
export function canAttemptEscape(state: GameState): boolean {
  return state.config.escapeOnDouble && state.config.twoDice
}

export function canAct(state: GameState, seat: Seat): boolean {
  if (state.finished) return false
  /* A blocked seat is not out of the game any more: at a table that plays the
     escaping double it takes its turn and rolls for its own freedom. It is
     only passed over when no roll of its could open the trap. */
  if (state.blocked[seat] !== null) return canAttemptEscape(state)
  return true
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
    if (canAct(state, candidate)) return candidate
  }
  return null
}
