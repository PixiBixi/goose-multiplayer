import { BOARD_SIZE, effectAt } from './board.js'
import { canAttemptEscape } from './rules.js'
import type { GameState, Seat, Square, Step } from './types.js'

/* The chain is provably bounded (see the spec), so this cap never fires on a
   correct reducer. It exists so a rule change that reopens a cycle fails a
   test instead of hanging a table. Do NOT raise it to make a test pass. */
export const MAX_STEPS = 16

/* Three, then the turn passes whatever the host chose. A double granting a
   roll that can grant another one is a loop, and rare is not never: the
   engine has a termination proof precisely so no rule can reopen one. Do NOT
   raise it. */
export const MAX_CONSECUTIVE_DOUBLES = 3

type Correction = Extract<Step, { kind: 'bounce' | 'overshoot' }>

/* One advance: forward by `by`, then whatever 63 does to a throw that goes
   past it. `reached` is the destination the advance points at before the
   correction applies, so the step that carries it reads like the throw did,
   and `correction` names the rule that trimmed it. */
type Advance = { landed: Square; reached: Square; correction: Correction | null }

function advance(from: Square, by: number, exactFinish: boolean): Advance {
  const raw = from + by
  if (raw > BOARD_SIZE) {
    const overshoot = raw - BOARD_SIZE
    /* Two different rules, two different kinds. Clamping silently was the
       same defect as the opening nine: the move step then reads as an
       ordinary advance that happens to stop on 63. */
    const landed = exactFinish ? BOARD_SIZE - overshoot : BOARD_SIZE
    return {
      landed,
      reached: raw,
      correction: {
        kind: exactFinish ? 'bounce' : 'overshoot',
        from: raw,
        to: landed,
        overshoot,
      },
    }
  }
  return { landed: raw, reached: raw, correction: null }
}

/* One of the seat's own turns spent in the trap, and the release when the
   count reaches the cap. Both doors that are not the rescue come through
   here, so a missed escape attempt and a turn spent being passed over cost
   exactly the same, which is what makes the cap a promise the player can
   count down on the seat plate. Mutates the reducer's private copy. */
function spendBlockedTurn(state: GameState, seat: Seat, steps: Step[]): void {
  const cap = state.config.maxBlockedTurns
  const reason = state.blocked[seat]
  if (reason === null || reason === undefined || cap === null) return
  const waited = (state.blockedTurns[seat] ?? 0) + 1
  if (waited < cap) {
    state.blockedTurns[seat] = waited
    return
  }
  state.blocked[seat] = null
  state.blockedTurns[seat] = 0
  steps.push({ kind: 'freed', seat, at: state.positions[seat] ?? 0, reason, waited })
}

/* Waiting is spent by being passed over, blocking is not: an inn costs one
   turn, a well costs turns until one of the three doors opens. Mutates the
   state it is handed, which is always the reducer's private copy.

   One function owns the whole rule, including the deadlock, because every
   caller that advances the turn has to agree on when the round is over. */
function nextTurnAfter(state: GameState, seat: Seat, steps: Step[]): Seat {
  const cap = state.config.maxBlockedTurns
  /* With a finite cap the table can be entirely blocked and still not be
     stuck: every lap raises each blocked seat's count, so one of them is out
     within `cap` laps and plays on the lap after that. With `null` there is a
     single lap and the deadlock below is the honest answer. Never unbounded:
     the loop is what proves the round ends. */
  const laps = cap === null ? 1 : Math.max(2, cap + 1)

  for (let lap = 0; lap < laps; lap++) {
    for (let hop = 1; hop <= state.seatCount; hop++) {
      const candidate = (seat + hop) % state.seatCount
      if (state.blocked[candidate] !== null) {
        /* A seat that can roll for its freedom takes its turn like anybody
           else. That is the whole point of the escape rule: the player plays
           instead of watching. The attempt itself is charged against the cap
           in applyRoll, not here, or it would cost the seat two turns. */
        if (canAttemptEscape(state)) return candidate
        spendBlockedTurn(state, candidate, steps)
        continue
      }
      if ((state.skipTurns[candidate] ?? 0) > 0) {
        state.skipTurns[candidate] = (state.skipTurns[candidate] ?? 0) - 1
        continue
      }
      return candidate
    }
  }

  /* Nobody can act, and nothing will change that: no rescue, no cap, no
     escaping double. A table that waits for a seat that will never move is
     worse than a round that ends. Said out loud: a round that stops with no
     winner is a rule of the spec, not a table that gave up. */
  state.finished = true
  state.winner = null
  steps.push({ kind: 'deadlock' })
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
    blockedTurns: [...state.blockedTurns],
    skipTurns: [...state.skipTurns],
  }

  const origin = next.positions[seat] ?? 0

  /* The door the blocked seat opens for itself. It rolls like anybody else,
     and a double is the key: it comes out AND moves by that same roll, chain
     and all. A miss costs one of its turns and the turn passes, which is what
     the cap counts. Reaching here unblocked-only is a caller bug, not a rule:
     nextTurnAfter never hands the turn to a seat that cannot use it. */
  const opened: Step[] = []
  const trapped = next.blocked[seat] ?? null
  if (trapped !== null) {
    if (!canAttemptEscape(next)) throw new Error('a blocked seat cannot roll at this table')
    const double = dice.length === 2 && dice[0] === dice[1]
    if (!double) {
      const missed: Step[] = [
        { kind: 'escapeFailed', seat, at: origin, reason: trapped, dice: [...dice] },
      ]
      spendBlockedTurn(next, seat, missed)
      next.consecutiveDoubles = 0
      next.turn = nextTurnAfter(next, seat, missed)
      return { state: next, steps: missed }
    }
    next.blocked[seat] = null
    next.blockedTurns[seat] = 0
    opened.push({ kind: 'escape', seat, at: origin, reason: trapped, dice: [...dice] })
  }

  /* The opening nine. A nine thrown from the start square chains the geese
     9, 18, 27, 36, 45, 54, 63 and wins outright, so the historic rule parks it
     on 26 or 53 instead. The opening square resolves nothing of its own: this
     is a placement, not an advance.

     Keyed on the square, not on whether the seat has rolled before. The rule
     exists because of the geometry: a nine from 0 reaches 63. Any seat
     standing on 0 has that shot, including one the third-double rule sent
     back there mid-game. Do NOT make this a first-roll test again. */
  const opening =
    origin === 0 && next.config.opening9 && next.config.twoDice && by === 9
      ? dice.includes(6)
        ? 26
        : 53
      : null

  if (opening !== null) {
    next.positions[seat] = opening
    next.consecutiveDoubles = 0
    const opened: Step[] = [{ kind: 'opening9', from: origin, to: opening, dice: [...dice] }]
    next.turn = nextTurnAfter(next, seat, opened)
    return { state: next, steps: opened }
  }
  const first = advance(origin, by, next.config.exactFinish)
  const steps: Step[] = [...opened, { kind: 'move', from: origin, to: first.reached, by }]
  if (first.correction) steps.push(first.correction)

  let square = first.landed
  let bounced = first.correction?.kind === 'bounce'

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
      if (hop.correction) {
        steps.push(hop.correction)
        /* Only a rebound silences the geese. An overshoot lands on 63 and the
           round is over, so there is nothing left for a goose to relaunch. */
        bounced ||= hop.correction.kind === 'bounce'
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
          /* Out is out: the turns it had already served are spent, and a seat
             that falls back in later starts its count from zero. */
          next.blockedTurns[held] = 0
          next.positions[held] = origin
          steps.push({ kind: 'rescue', seat: held, at: square, to: origin, reason: effect.reason })
        }
      }
      next.blocked[seat] = effect.reason
      next.blockedTurns[seat] = 0
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
    next.consecutiveDoubles = 0
    steps.push({ kind: 'win', seat, at: BOARD_SIZE })
    return { state: next, steps }
  }

  /* The doubles house rule. A seat that ends its resolution blocked or
     waiting has nothing to roll again with, and rolling again out of the
     prison you were just sent to would read as a reward.

     An escaping double buys the way out of the trap and nothing else: it does
     NOT also grant the bonus roll, or the well would pay better than an
     ordinary square. The rule card says so, because it reads like a bug. */
  const rolledDouble =
    trapped === null &&
    next.config.doubleAgain &&
    next.config.twoDice &&
    dice.length === 2 &&
    dice[0] === dice[1] &&
    next.blocked[seat] === null &&
    (next.skipTurns[seat] ?? 0) === 0

  if (rolledDouble) {
    const streak = next.consecutiveDoubles + 1
    if (streak < MAX_CONSECUTIVE_DOUBLES) {
      next.consecutiveDoubles = streak
      steps.push({ kind: 'double', seat, dice: [...dice] })
      /* The turn does not move. Same seat, same view, one more roll. */
      return { state: next, steps }
    }

    /* The third in a row. What it costs is the host's choice, and 'restart'
       is deliberately harsher than La Mort on 58: back to the start, off the
       board. Which puts the seat back within reach of a nine to 63, and the
       opening nine covers it: that rule keys on the square, not on the turn
       counter, precisely so this path cannot reopen the instant win. */
    const outcome = next.config.tripleDouble
    const landing = outcome === 'restart' ? 0 : square
    next.positions[seat] = landing
    steps.push({ kind: 'tripleDouble', seat, outcome, from: square, to: landing })
  }

  next.consecutiveDoubles = 0
  next.turn = nextTurnAfter(next, seat, steps)
  return { state: next, steps }
}
