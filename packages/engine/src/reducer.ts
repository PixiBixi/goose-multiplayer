import { BOARD_SIZE, effectAt } from './board.js'
import type { GameState, Seat, Square, Step } from './types.js'

/* The chain is provably bounded (see the spec), so this cap never fires on a
   correct reducer. It exists so a rule change that reopens a cycle fails a
   test instead of hanging a table. Do NOT raise it to make a test pass. */
export const MAX_STEPS = 16

type Bounce = Extract<Step, { kind: 'bounce' }>

/* One advance: forward by `by`, rebounding off 63 when exact finish is on.
   `reached` is the destination the advance points at before the rebound
   corrects it, so the step that carries it reads like the throw did. */
type Advance = { landed: Square; reached: Square; bounce: Bounce | null }

function advance(from: Square, by: number, exactFinish: boolean): Advance {
  const raw = from + by
  if (raw > BOARD_SIZE && exactFinish) {
    const landed = BOARD_SIZE - (raw - BOARD_SIZE)
    return {
      landed,
      reached: raw,
      bounce: { kind: 'bounce', from: raw, to: landed, overshoot: raw - BOARD_SIZE },
    }
  }
  const landed = Math.min(raw, BOARD_SIZE)
  return { landed, reached: landed, bounce: null }
}

/* Waiting is spent by being passed over, blocking is not: an inn costs one
   turn, a well costs turns until someone frees you. Mutates the state it is
   handed, which is always the reducer's private copy.

   One function owns the whole rule, including the deadlock, because every
   caller that advances the turn has to agree on when the round is over. */
function nextTurnAfter(state: GameState, seat: Seat): Seat {
  for (let hop = 1; hop <= state.seatCount; hop++) {
    const candidate = (seat + hop) % state.seatCount
    if (state.blocked[candidate] !== null) continue
    if ((state.skipTurns[candidate] ?? 0) > 0) {
      state.skipTurns[candidate] = (state.skipTurns[candidate] ?? 0) - 1
      continue
    }
    return candidate
  }

  /* Nobody can act. With the rescue rule off, seats can be stuck for good, and
     a table that waits for a seat that will never move is worse than a round
     that ends. */
  state.finished = true
  state.winner = null
  return seat
}

export function applyRoll(state: GameState, dice: number[]): { state: GameState; steps: Step[] } {
  if (state.finished) throw new Error('the game is finished')

  const seat = state.turn
  const by = dice.reduce((a, b) => a + b, 0)
  const next: GameState = {
    ...state,
    positions: [...state.positions],
    blocked: [...state.blocked],
    skipTurns: [...state.skipTurns],
    hasRolled: [...state.hasRolled],
  }
  next.hasRolled[seat] = true

  const origin = next.positions[seat] ?? 0
  const first = advance(origin, by, next.config.exactFinish)
  const steps: Step[] = [{ kind: 'move', from: origin, to: first.reached, by }]
  if (first.bounce) steps.push(first.bounce)

  let square = first.landed
  let bounced = first.bounce !== null

  while (true) {
    const effect = effectAt(square)

    /* A goose fires on an advance only. After a rebound off 63 it stays
       silent, or a rebound onto a goose would relaunch an advance that
       rebounds again. Do NOT drop the `bounced` guard. */
    if (effect?.kind === 'goose' && !bounced) {
      if (steps.length + 2 > MAX_STEPS) {
        throw new Error('resolution chain exceeded the step cap')
      }
      const hop = advance(square, by, next.config.exactFinish)
      steps.push({ kind: 'goose', from: square, to: hop.reached, by })
      if (hop.bounce) {
        steps.push(hop.bounce)
        bounced = true
      }
      square = hop.landed
      continue
    }

    if (
      effect &&
      (effect.kind === 'bridge' ||
        effect.kind === 'dice' ||
        effect.kind === 'maze' ||
        effect.kind === 'death')
    ) {
      steps.push({ kind: effect.kind, from: square, to: effect.to })
      square = effect.to
      /* The arrival square resolves nothing. Without this, 26 sends to 53,
         which sends back to 26, for ever. Do NOT remove. */
      break
    }

    if (effect?.kind === 'block') {
      /* Rescue is an effect of another seat arriving, not a timer: it belongs
         here, in the reducer, so it is testable without a clock. */
      if (next.config.rescue) {
        const held = next.blocked.findIndex(
          (reason, other) => other !== seat && reason !== null && next.positions[other] === square,
        )
        if (held >= 0) {
          next.blocked[held] = null
          next.positions[held] = origin
          steps.push({ kind: 'rescue', seat: held, at: square, to: origin })
        }
      }
      next.blocked[seat] = effect.reason
      steps.push({ kind: 'blocked', seat, at: square, reason: effect.reason })
      break
    }

    if (effect?.kind === 'inn') {
      next.skipTurns[seat] = (next.skipTurns[seat] ?? 0) + effect.turns
      steps.push({ kind: 'skip', seat, turns: effect.turns })
      break
    }

    break
  }

  next.positions[seat] = square

  if (square === BOARD_SIZE) {
    next.winner = seat
    next.finished = true
    steps.push({ kind: 'win', seat, at: BOARD_SIZE })
    return { state: next, steps }
  }

  next.turn = nextTurnAfter(next, seat)
  return { state: next, steps }
}
