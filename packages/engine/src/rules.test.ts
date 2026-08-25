import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { canAct, canAttemptEscape, legalMoves, nextSeat } from './rules.js'
import { gameAt } from './test-helpers.js'

/* The historic table: the well and the prison have exactly one door, and it
   is somebody else's arrival. It is what these tests are for, and it is the
   only configuration where a round can still deadlock. */
const RESCUE_ONLY = { maxBlockedTurns: null, escapeOnDouble: false } as const

describe('rules', () => {
  it('offers a roll only to the seat whose turn it is', () => {
    const s = gameAt([1, 1])
    expect(legalMoves(s, 0)).toEqual(['roll'])
    expect(legalMoves(s, 1)).toEqual([])
  })

  it('offers nothing once the game is finished', () => {
    expect(legalMoves({ ...gameAt([63, 1]), finished: true, winner: 0 }, 0)).toEqual([])
  })

  it('offers a blocked seat its roll, so it can try for the double', () => {
    expect(legalMoves({ ...gameAt([31, 1]), blocked: ['well', null] }, 0)).toEqual(['roll'])
  })

  it('offers nothing to a blocked seat at a table with no escaping double', () => {
    const stuck = { ...gameAt([31, 1], RESCUE_ONLY), blocked: ['well' as const, null] }
    expect(legalMoves(stuck, 0)).toEqual([])
    expect(canAct(stuck, 0)).toBe(false)
  })

  it('offers nothing to a blocked seat on one die, where no double exists', () => {
    const stuck = { ...gameAt([31, 1], { twoDice: false }), blocked: ['well' as const, null] }
    expect(canAttemptEscape(stuck)).toBe(false)
    expect(legalMoves(stuck, 0)).toEqual([])
  })

  it('skips a waiting seat and spends one of its waits', () => {
    const start = { ...gameAt([1, 1, 1]), skipTurns: [0, 1, 0] }
    const { state } = applyRoll(start, [1, 1])
    expect(state.turn).toBe(2)
    expect(state.skipTurns[1]).toBe(0)
  })

  it('hands the turn to a blocked seat that can roll for its freedom', () => {
    const start = { ...gameAt([1, 31, 1]), blocked: [null, 'well' as const, null] }
    const { state } = applyRoll(start, [1, 2])
    expect(state.turn).toBe(1)
    expect(state.blocked[1]).toBe('well')
  })

  it('skips a blocked seat when no roll of its could free it', () => {
    const start = { ...gameAt([1, 31, 1], RESCUE_ONLY), blocked: [null, 'well' as const, null] }
    const { state } = applyRoll(start, [1, 1])
    expect(state.turn).toBe(2)
    expect(state.blocked[1]).toBe('well')
    expect(state.blockedTurns[1]).toBe(0)
  })

  it('names the seat after the current one', () => {
    expect(nextSeat(gameAt([1, 1, 1]))).toBe(1)
  })

  it('hops over a blocked seat that cannot act', () => {
    const stuck = { ...gameAt([1, 31, 1], RESCUE_ONLY), blocked: [null, 'well' as const, null] }
    expect(nextSeat(stuck)).toBe(2)
  })

  it('reports no next seat when everyone is stuck', () => {
    const stuck = {
      ...gameAt([31, 52], RESCUE_ONLY),
      blocked: ['well' as const, 'prison' as const],
    }
    expect(nextSeat(stuck)).toBeNull()
    expect(canAct(stuck, 0)).toBe(false)
  })

  /* The deadlock is a rule of the spec, and it survives the escape rules: it
     is what happens when a table deliberately plays with rescue as the only
     door and every remaining seat is behind it. Do NOT delete this test
     because the default configuration can no longer reach it. */
  it('finishes the round with no winner when nobody can act', () => {
    const start = {
      ...gameAt([29, 52], { rescue: false, ...RESCUE_ONLY }),
      blocked: [null, 'prison' as const],
      turn: 0,
    }
    const { state, steps } = applyRoll(start, [1, 1]) // seat 0 lands in the well
    expect(state.blocked[0]).toBe('well')
    expect(state.finished).toBe(true)
    expect(state.winner).toBeNull()
    /* And it says so. A null winner on a finished round is the client being
       left to work the rule out from the absence of something. */
    expect(steps.at(-1)).toEqual({ kind: 'deadlock' })
  })

  it('never deadlocks a table that caps the wait', () => {
    const start = {
      ...gameAt([29, 52], { rescue: false, escapeOnDouble: false }),
      blocked: [null, 'prison' as const],
      turn: 0,
    }
    const { state, steps } = applyRoll(start, [1, 1]) // seat 0 lands in the well
    expect(state.finished).toBe(false)
    expect(steps.some((step) => step.kind === 'deadlock')).toBe(false)
    /* Both seats are in a hole, so the cap is the only clock left running:
       it frees somebody rather than ending the round. */
    expect(state.blocked.some((reason) => reason === null)).toBe(true)
  })

  it('says nothing about a deadlock while a seat can still roll', () => {
    const start = { ...gameAt([29, 10], { rescue: false, ...RESCUE_ONLY }), turn: 0 }
    const { steps } = applyRoll(start, [1, 1])
    expect(steps.some((step) => step.kind === 'deadlock')).toBe(false)
  })
})
