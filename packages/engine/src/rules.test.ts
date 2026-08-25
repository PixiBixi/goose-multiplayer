import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { canAct, legalMoves, nextSeat } from './rules.js'
import { gameAt } from './test-helpers.js'

describe('rules', () => {
  it('offers a roll only to the seat whose turn it is', () => {
    const s = gameAt([1, 1])
    expect(legalMoves(s, 0)).toEqual(['roll'])
    expect(legalMoves(s, 1)).toEqual([])
  })

  it('offers nothing once the game is finished', () => {
    expect(legalMoves({ ...gameAt([63, 1]), finished: true, winner: 0 }, 0)).toEqual([])
  })

  it('offers nothing to a blocked seat', () => {
    expect(legalMoves({ ...gameAt([31, 1]), blocked: ['well', null] }, 0)).toEqual([])
  })

  it('skips a waiting seat and spends one of its waits', () => {
    const start = { ...gameAt([1, 1, 1]), skipTurns: [0, 1, 0] }
    const { state } = applyRoll(start, [1, 1])
    expect(state.turn).toBe(2)
    expect(state.skipTurns[1]).toBe(0)
  })

  it('skips a blocked seat without spending anything', () => {
    const start = { ...gameAt([1, 31, 1]), blocked: [null, 'well' as const, null] }
    const { state } = applyRoll(start, [1, 1])
    expect(state.turn).toBe(2)
    expect(state.blocked[1]).toBe('well')
  })

  it('reports no next seat when everyone is stuck', () => {
    const stuck = {
      ...gameAt([31, 52]),
      blocked: ['well' as const, 'prison' as const],
    }
    expect(nextSeat(stuck)).toBeNull()
    expect(canAct(stuck, 0)).toBe(false)
  })

  it('finishes the round with no winner when nobody can act', () => {
    const start = {
      ...gameAt([29, 52], { rescue: false }),
      blocked: [null, 'prison' as const],
      turn: 0,
    }
    const { state } = applyRoll(start, [1, 1]) // seat 0 lands in the well
    expect(state.blocked[0]).toBe('well')
    expect(state.finished).toBe(true)
    expect(state.winner).toBeNull()
  })
})
