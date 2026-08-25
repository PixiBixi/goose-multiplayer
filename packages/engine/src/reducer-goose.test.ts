import { describe, expect, it } from 'vitest'
import { MAX_STEPS, applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, geese', () => {
  it('advances again by the same roll from a goose', () => {
    // 3 + 2 = 5, a goose, then 5 + 2 = 7, ordinary.
    const { state, steps } = applyRoll(gameAt([3, 0]), [1, 1])
    expect(state.positions[0]).toBe(7)
    expect(steps).toEqual([
      { kind: 'move', from: 3, to: 5, by: 2 },
      { kind: 'goose', from: 5, to: 7, by: 2 },
    ])
  })

  it('chains from goose to goose', () => {
    // 5 + 9 = 14, goose; 14 + 9 = 23, goose; 23 + 9 = 32, goose; 32 + 9 = 41,
    // goose; 41 + 9 = 50, goose; 50 + 9 = 59, goose; 59 + 9 = 68 -> bounce.
    const { state, steps } = applyRoll(gameAt([5, 0]), [5, 4])
    const geese = steps.filter((s) => s.kind === 'goose')
    expect(geese.length).toBeGreaterThanOrEqual(5)
    expect(state.positions[0]).toBe(63 - (68 - 63))
    expect(steps.at(-1)).toEqual({ kind: 'bounce', from: 68, to: 58, overshoot: 5 })
  })

  it('carries the raw destination on the goose step that overshoots', () => {
    // The bounce step, not the goose step, is what corrects 68 to 58. Every
    // step's `to` is the square the pawn sits on once that step has played.
    const { steps } = applyRoll(gameAt([5, 0]), [5, 4])
    expect(steps.at(-2)).toEqual({ kind: 'goose', from: 59, to: 68, by: 9 })
  })

  it('does not trigger a goose after a rebound', () => {
    // 60 + 4 = 64 -> bounce to 62. 62 is ordinary, but the rule holds even
    // when the rebound lands on a goose, so assert on the step kinds.
    const { steps } = applyRoll(gameAt([60, 0]), [2, 2])
    expect(steps.some((s) => s.kind === 'goose')).toBe(false)
  })

  it('does not relaunch a chain when the rebound lands on a goose', () => {
    // 58 + 10 = 68 -> bounce to 58... use 55 + 9 = 64 -> bounce to 62. The
    // only rebound landing on a goose is 63 - k with k the overshoot: 59 is a
    // goose, so an overshoot of 4 from 63 lands there.
    const { state, steps } = applyRoll(gameAt([62, 0]), [3, 2])
    expect(steps).toContainEqual({ kind: 'bounce', from: 67, to: 59, overshoot: 4 })
    expect(steps.some((s) => s.kind === 'goose')).toBe(false)
    expect(state.positions[0]).toBe(59)
  })

  it.skip('lets a goose chain feed a teleport square', () => {
    // 4 + 1 = 5, a goose; 5 + 1 = 6, the bridge.
    const { steps } = applyRoll(gameAt([4, 0], { twoDice: false }), [1])
    expect(steps.map((s) => s.kind)).toEqual(['move', 'goose', 'bridge'])
  })

  it('never exceeds the step cap', () => {
    const { steps } = applyRoll(gameAt([5, 0]), [5, 4])
    expect(steps.length).toBeLessThanOrEqual(MAX_STEPS)
  })
})
