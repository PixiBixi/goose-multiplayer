import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from './board.js'
import { MAX_STEPS, applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

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
