import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, teleports', () => {
  it('sends the bridge to twelve', () => {
    const { state, steps } = applyRoll(gameAt([4, 0]), [1, 1])
    expect(state.positions[0]).toBe(12)
    expect(steps).toContainEqual({ kind: 'bridge', from: 6, to: 12 })
  })

  it('sends the maze back to thirty', () => {
    const { state, steps } = applyRoll(gameAt([40, 0]), [1, 1])
    expect(state.positions[0]).toBe(30)
    expect(steps).toContainEqual({ kind: 'maze', from: 42, to: 30 })
  })

  it('sends death back to one', () => {
    const { state, steps } = applyRoll(gameAt([56, 0]), [1, 1])
    expect(state.positions[0]).toBe(1)
    expect(steps).toContainEqual({ kind: 'death', from: 58, to: 1 })
  })

  it('sends twenty-six to fifty-three and stops there', () => {
    const { state, steps } = applyRoll(gameAt([24, 0]), [1, 1])
    expect(state.positions[0]).toBe(53)
    expect(steps).toContainEqual({ kind: 'dice', from: 26, to: 53 })
    // The arrival square's own effect must not fire, or 53 would send back to
    // 26, which sends back to 53, for ever.
    expect(steps.filter((s) => s.kind === 'dice')).toHaveLength(1)
  })

  it('sends fifty-three back to twenty-six and stops there', () => {
    const { state, steps } = applyRoll(gameAt([51, 0]), [1, 1])
    expect(state.positions[0]).toBe(26)
    expect(steps.filter((s) => s.kind === 'dice')).toHaveLength(1)
  })

  it('applies a teleport reached by a rebound', () => {
    const { state, steps } = applyRoll(gameAt([59, 0]), [5, 4])
    expect(steps).toContainEqual({ kind: 'bounce', from: 68, to: 58, overshoot: 5 })
    expect(steps).toContainEqual({ kind: 'death', from: 58, to: 1 })
    expect(state.positions[0]).toBe(1)
  })
})
