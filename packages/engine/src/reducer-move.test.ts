import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, plain movement', () => {
  it('advances by the sum of the dice', () => {
    const { state, steps } = applyRoll(gameAt([1, 0]), [4, 3])
    expect(state.positions[0]).toBe(8)
    expect(steps[0]).toEqual({ kind: 'move', from: 1, to: 8, by: 7 })
  })

  it('records the arrival on an ordinary square as a single step', () => {
    const { steps } = applyRoll(gameAt([1, 0]), [1, 1])
    expect(steps).toEqual([{ kind: 'move', from: 1, to: 3, by: 2 }])
  })

  it('wins on sixty-three', () => {
    const { state, steps } = applyRoll(gameAt([60, 0]), [2, 1])
    expect(state.positions[0]).toBe(63)
    expect(state.winner).toBe(0)
    expect(state.finished).toBe(true)
    expect(steps.at(-1)).toEqual({ kind: 'win', seat: 0, at: 63 })
  })

  it('bounces back by the overshoot when exact finish is on', () => {
    const { state, steps } = applyRoll(gameAt([62, 0]), [3, 1])
    expect(state.positions[0]).toBe(60)
    expect(steps).toContainEqual({ kind: 'bounce', from: 66, to: 60, overshoot: 3 })
    expect(state.winner).toBeNull()
  })

  it('wins on an overshoot when exact finish is off', () => {
    const { state } = applyRoll(gameAt([62, 0], { exactFinish: false }), [3, 1])
    expect(state.positions[0]).toBe(63)
    expect(state.winner).toBe(0)
  })

  it('names the dropped surplus rather than clamping it in silence', () => {
    /* The mirror of the bounce. Without its own kind, the chain reads
       `move 62 -> 63 by 4`, which is an ordinary advance that happens to
       land on the last square, and the rule that trimmed it is invisible. */
    const { steps } = applyRoll(gameAt([62, 0], { exactFinish: false }), [3, 1])
    expect(steps[0]).toEqual({ kind: 'move', from: 62, to: 66, by: 4 })
    expect(steps).toContainEqual({ kind: 'overshoot', from: 66, to: 63, overshoot: 3 })
    expect(steps.some((step) => step.kind === 'bounce')).toBe(false)
  })

  it('emits no correction at all when the throw lands square on 63', () => {
    const { steps } = applyRoll(gameAt([60, 0], { exactFinish: false }), [2, 1])
    expect(steps.some((step) => step.kind === 'overshoot' || step.kind === 'bounce')).toBe(false)
  })

  it('passes the turn to the next seat', () => {
    const { state } = applyRoll(gameAt([1, 1, 1]), [1, 1])
    expect(state.turn).toBe(1)
  })

  it('refuses to roll on a finished game', () => {
    const finished = { ...gameAt([63, 0]), finished: true, winner: 0 }
    expect(() => applyRoll(finished, [1, 1])).toThrow(/finished/i)
  })
})
