import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from './board.js'
import { DEFAULT_CONFIG, createGame } from './init.js'
import { MAX_STEPS, applyRoll } from './reducer.js'
import { makeRng, rollDice } from './rng.js'
import { gameAt } from './test-helpers.js'
import type { GameState, TableConfig } from './types.js'

/* A whole game, played by nobody in particular. Long enough that a table that
   cannot end fails here instead of hanging a room. */
const MAX_ROLLS = 5_000

function playOut(
  seats: number,
  seed: number,
  config: Partial<TableConfig>,
  watch: (state: GameState, seat: number) => void,
): GameState {
  let state = createGame(seats, config)
  const rng = makeRng(seed)
  for (let roll = 0; roll < MAX_ROLLS && !state.finished; roll++) {
    const seat = state.turn
    watch(state, seat)
    state = applyRoll(state, rollDice(rng, state.config.twoDice ? 2 : 1)).state
  }
  return state
}

const die = fc.integer({ min: 1, max: 6 })

describe('engine invariants', () => {
  it('always terminates and stays on the board', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 62 }),
        die,
        die,
        fc.boolean(),
        fc.boolean(),
        fc.constantFrom('pass' as const, 'restart' as const),
        (from, a, b, exact, doubleAgain, tripleDouble) => {
          const start = gameAt([from, 0], { exactFinish: exact, doubleAgain, tripleDouble })
          const { state, steps } = applyRoll(start, [a, b])
          expect(steps.length).toBeLessThanOrEqual(MAX_STEPS)
          const landed = state.positions[0] ?? -1
          expect(landed).toBeGreaterThanOrEqual(0)
          expect(landed).toBeLessThanOrEqual(BOARD_SIZE)
        },
      ),
      { numRuns: 5000 },
    )
  })

  it('ends the chain on the square the last step points at', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, (from, a, b) => {
        const { state, steps } = applyRoll(gameAt([from, 0]), [a, b])
        const last = steps.filter((s) => 'to' in s).at(-1)
        if (last && 'to' in last) expect(state.positions[0]).toBe(last.to)
      }),
      { numRuns: 5000 },
    )
  })

  it('rebounds at most once per turn', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, (from, a, b) => {
        const { steps } = applyRoll(gameAt([from, 0]), [a, b])
        expect(steps.filter((s) => s.kind === 'bounce').length).toBeLessThanOrEqual(1)
      }),
      { numRuns: 5000 },
    )
  })

  /* The bound the whole blocking fix rests on, asserted on real games rather
     than argued for. With the escaping double on, a blocked seat is never
     passed over: every one of its turns is a roll, so counting consecutive
     rolls made while blocked counts exactly the turns it spent in the hole. */
  it('never keeps a seat blocked for more than the cap, over whole games', () => {
    const cap = DEFAULT_CONFIG.maxBlockedTurns ?? 0
    expect(cap).toBeGreaterThan(0)
    for (let seed = 0; seed < 300; seed++) {
      const streak = [0, 0, 0]
      const end = playOut(3, seed, {}, (state, seat) => {
        streak[seat] = state.blocked[seat] === null ? 0 : (streak[seat] ?? 0) + 1
        expect(streak[seat]).toBeLessThanOrEqual(cap)
      })
      expect(end.finished).toBe(true)
    }
  })

  /* The other half of the same promise, for the table that plays the cap
     without the escaping double: there the seat is passed over rather than
     rolling, and the step it is let go with is what says how long it sat. */
  it('never lets a seat wait longer than the cap when it is passed over', () => {
    for (let seed = 0; seed < 300; seed++) {
      let state = createGame(3, { escapeOnDouble: false })
      const rng = makeRng(seed)
      for (let roll = 0; roll < MAX_ROLLS && !state.finished; roll++) {
        const turn = applyRoll(state, rollDice(rng, 2))
        for (const step of turn.steps) {
          if (step.kind === 'freed') expect(step.waited).toBe(DEFAULT_CONFIG.maxBlockedTurns)
        }
        state = turn.state
      }
      expect(state.finished).toBe(true)
    }
  })

  it('never mutates the state it was given', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, (from, a, b) => {
        const before = gameAt([from, 0])
        const snapshot = JSON.stringify(before)
        applyRoll(before, [a, b])
        expect(JSON.stringify(before)).toBe(snapshot)
      }),
      { numRuns: 2000 },
    )
  })
})
