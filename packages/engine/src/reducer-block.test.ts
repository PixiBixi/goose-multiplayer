import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, blocking and waiting', () => {
  it('blocks in the well', () => {
    const { state, steps } = applyRoll(gameAt([29, 0]), [1, 1])
    expect(state.positions[0]).toBe(31)
    expect(state.blocked[0]).toBe('well')
    expect(steps).toContainEqual({ kind: 'blocked', seat: 0, at: 31, reason: 'well' })
  })

  it('blocks in prison', () => {
    const { state } = applyRoll(gameAt([50, 0]), [1, 1])
    expect(state.blocked[0]).toBe('prison')
  })

  it('makes the inn cost one turn', () => {
    const { state, steps } = applyRoll(gameAt([17, 0]), [1, 1])
    expect(state.positions[0]).toBe(19)
    expect(state.skipTurns[0]).toBe(1)
    expect(steps).toContainEqual({ kind: 'skip', seat: 0, turns: 1 })
  })

  it('releases the seat already in the well and takes its place', () => {
    const start = { ...gameAt([31, 29]), blocked: ['well' as const, null], turn: 1 }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.positions[1]).toBe(31)
    expect(state.blocked[1]).toBe('well')
    expect(state.blocked[0]).toBeNull()
    expect(state.positions[0]).toBe(29)
    expect(steps).toContainEqual({ kind: 'rescue', seat: 0, at: 31, to: 29, reason: 'well' })
  })

  it('does not release anyone when the rescue rule is off', () => {
    const start = {
      ...gameAt([31, 29], { rescue: false }),
      blocked: ['well' as const, null],
      turn: 1,
    }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.blocked[0]).toBe('well')
    expect(state.blocked[1]).toBe('well')
    expect(steps.some((s) => s.kind === 'rescue')).toBe(false)
  })

  it('says which trap a rescue opened, so the client never looks the square up', () => {
    const start = { ...gameAt([52, 50]), blocked: ['prison' as const, null], turn: 1 }
    const { steps } = applyRoll(start, [1, 1])
    expect(steps).toContainEqual({ kind: 'rescue', seat: 0, at: 52, to: 50, reason: 'prison' })
  })

  it('does not release across different squares', () => {
    const start = {
      ...gameAt([52, 29], { rescue: true }),
      blocked: ['prison' as const, null],
      turn: 1,
    }
    const { state } = applyRoll(start, [1, 1])
    expect(state.blocked[0]).toBe('prison')
  })
})
