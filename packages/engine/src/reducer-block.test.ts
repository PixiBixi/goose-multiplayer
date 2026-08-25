import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'
import type { GameState, Step } from './types.js'

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

  it('resets the count of a seat a rescue pulls out', () => {
    const start = {
      ...gameAt([31, 29]),
      blocked: ['well' as const, null],
      blockedTurns: [2, 0],
      turn: 1,
    }
    const { state } = applyRoll(start, [1, 1])
    expect(state.blocked[0]).toBeNull()
    expect(state.blockedTurns[0]).toBe(0)
  })
})

/* The three doors out of the well and the prison, and the counter that makes
   the third one a promise rather than a hope. */
describe('applyRoll, getting out of the well and the prison', () => {
  /* A table that plays the cap without the escaping double: the blocked seat
     is passed over, and the turns it is passed over are what free it. */
  const WAIT_ONLY = { escapeOnDouble: false } as const

  it("spends one of the blocked seat's turns each time the table laps it", () => {
    const start = { ...gameAt([1, 31], WAIT_ONLY), blocked: [null, 'well' as const], turn: 0 }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.blockedTurns[1]).toBe(1)
    expect(steps.some((step) => step.kind === 'freed')).toBe(false)
  })

  it('frees the seat when the cap is reached, and says how long it waited', () => {
    const start = {
      ...gameAt([1, 31], WAIT_ONLY),
      blocked: [null, 'well' as const],
      blockedTurns: [0, 2],
      turn: 0,
    }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.blocked[1]).toBeNull()
    expect(state.blockedTurns[1]).toBe(0)
    expect(steps).toContainEqual({ kind: 'freed', seat: 1, at: 31, reason: 'well', waited: 3 })
  })

  it('leaves the seat where it stood, so it rolls out of the trap on its own turn', () => {
    const start = {
      ...gameAt([1, 52], WAIT_ONLY),
      blocked: [null, 'prison' as const],
      blockedTurns: [0, 2],
      turn: 0,
    }
    /* The lap that reaches the cap is the last one the seat sits out: it is
       let go as the table passes it, and plays on the lap after. */
    const freed = applyRoll(start, [1, 1]).state
    expect(freed.positions[1]).toBe(52)
    expect(freed.blocked[1]).toBeNull()
    expect(freed.turn).toBe(0)
    const played = applyRoll(freed, [1, 3]).state
    expect(played.turn).toBe(1)
    const { state } = applyRoll(played, [1, 2])
    expect(state.positions[1]).toBe(55)
  })

  it('never frees anybody at a table that plays rescue only', () => {
    const start = {
      ...gameAt([1, 31], { maxBlockedTurns: null, escapeOnDouble: false }),
      blocked: [null, 'well' as const],
      blockedTurns: [0, 2],
      turn: 0,
    }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.blocked[1]).toBe('well')
    expect(steps.some((step) => step.kind === 'freed')).toBe(false)
  })

  it('hands the blocked seat its turn and frees it on a double, move and all', () => {
    const start = { ...gameAt([1, 29]), blocked: [null, 'well' as const], turn: 1 }
    const { state, steps } = applyRoll({ ...start, positions: [1, 31] }, [2, 2])
    expect(state.blocked[1]).toBeNull()
    expect(state.blockedTurns[1]).toBe(0)
    expect(steps[0]).toEqual({ kind: 'escape', seat: 1, at: 31, reason: 'well', dice: [2, 2] })
    /* Out AND moving: the escape is the same roll, so 31 plus four is 35. */
    expect(state.positions[1]).toBe(35)
    expect(steps).toContainEqual({ kind: 'move', from: 31, to: 35, by: 4 })
  })

  it('resolves the chain of an escaping roll like any other', () => {
    /* 52 plus two is 54, an oie, which relaunches the same two. */
    const start = { ...gameAt([1, 52]), blocked: [null, 'prison' as const], turn: 1 }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(steps).toContainEqual({ kind: 'goose', from: 54, to: 56, by: 2 })
    expect(state.positions[1]).toBe(56)
  })

  it('spends the attempt and passes the turn when the dice are not a double', () => {
    const start = { ...gameAt([1, 31]), blocked: [null, 'well' as const], turn: 1 }
    const { state, steps } = applyRoll(start, [1, 2])
    expect(state.blocked[1]).toBe('well')
    expect(state.positions[1]).toBe(31)
    expect(state.blockedTurns[1]).toBe(1)
    expect(steps).toContainEqual({
      kind: 'escapeFailed',
      seat: 1,
      at: 31,
      reason: 'well',
      dice: [1, 2],
    })
    expect(state.turn).toBe(0)
  })

  it('bounds the attempts at the cap and frees the seat on the last miss', () => {
    let state: GameState = { ...gameAt([1, 31]), blocked: [null, 'well' as const], turn: 1 }
    const missed: Step[] = []
    for (let attempt = 0; attempt < 3; attempt++) {
      const turn = applyRoll(state, [1, 2])
      missed.push(...turn.steps)
      state = { ...turn.state, turn: 1 }
    }
    expect(missed.filter((step) => step.kind === 'escapeFailed')).toHaveLength(3)
    expect(missed).toContainEqual({ kind: 'freed', seat: 1, at: 31, reason: 'well', waited: 3 })
    expect(state.blocked[1]).toBeNull()
  })

  it('does not hand an extra roll to the double that opened the trap', () => {
    const start = {
      ...gameAt([1, 31], { doubleAgain: true }),
      blocked: [null, 'well' as const],
      turn: 1,
    }
    const { state, steps } = applyRoll(start, [2, 2])
    expect(steps.some((step) => step.kind === 'double')).toBe(false)
    expect(state.turn).toBe(0)
    expect(state.consecutiveDoubles).toBe(0)
  })

  it('passes over a blocked seat on one die rather than making it roll', () => {
    const start = {
      ...gameAt([1, 31], { twoDice: false }),
      blocked: [null, 'well' as const],
      turn: 0,
    }
    const { state } = applyRoll(start, [2])
    expect(state.turn).toBe(0)
    expect(state.blockedTurns[1]).toBe(1)
  })

  it("refuses a blocked seat's roll at a table where no double could free it", () => {
    const start = {
      ...gameAt([1, 31], { escapeOnDouble: false }),
      blocked: [null, 'well' as const],
      turn: 1,
    }
    expect(() => applyRoll(start, [2, 2])).toThrow(/blocked seat/i)
  })

  it('starts the count from zero for a seat that falls back in', () => {
    const start = { ...gameAt([29, 1]), blockedTurns: [2, 0], turn: 0 }
    const { state } = applyRoll(start, [1, 1])
    expect(state.blocked[0]).toBe('well')
    expect(state.blockedTurns[0]).toBe(0)
  })

  it('keeps the inn counter and the trap counter apart', () => {
    const { state } = applyRoll(gameAt([17, 0]), [1, 1])
    expect(state.skipTurns[0]).toBe(1)
    expect(state.blocked[0]).toBeNull()
    expect(state.blockedTurns[0]).toBe(0)
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
