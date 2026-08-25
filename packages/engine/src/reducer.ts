import { BOARD_SIZE } from './board.js'
import type { GameState, Square, Step } from './types.js'

/* The chain is provably bounded (see the spec), so this cap never fires on a
   correct reducer. It exists so a rule change that reopens a cycle fails a
   test instead of hanging a table. Do NOT raise it to make a test pass. */
export const MAX_STEPS = 16

export function applyRoll(state: GameState, dice: number[]): { state: GameState; steps: Step[] } {
  if (state.finished) throw new Error('the game is finished')

  const seat = state.turn
  const by = dice.reduce((a, b) => a + b, 0)
  const steps: Step[] = []
  const next: GameState = {
    ...state,
    positions: [...state.positions],
    blocked: [...state.blocked],
    skipTurns: [...state.skipTurns],
    hasRolled: [...state.hasRolled],
  }
  next.hasRolled[seat] = true

  const from = next.positions[seat] ?? 0
  const raw = from + by

  let landed: Square
  if (raw > BOARD_SIZE && next.config.exactFinish) {
    landed = BOARD_SIZE - (raw - BOARD_SIZE)
    steps.push({ kind: 'move', from, to: raw, by })
    steps.push({ kind: 'bounce', from: raw, to: landed, overshoot: raw - BOARD_SIZE })
  } else {
    landed = Math.min(raw, BOARD_SIZE)
    steps.push({ kind: 'move', from, to: landed, by })
  }

  next.positions[seat] = landed

  if (landed === BOARD_SIZE) {
    next.winner = seat
    next.finished = true
    steps.push({ kind: 'win', seat, at: BOARD_SIZE })
    return { state: next, steps }
  }

  next.turn = (seat + 1) % next.seatCount
  return { state: next, steps }
}
