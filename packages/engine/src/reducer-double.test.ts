import { describe, expect, it } from 'vitest'
import { createGame } from './init.js'
import { MAX_CONSECUTIVE_DOUBLES, applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'
import type { GameState, TableConfig } from './types.js'

/* An invented house rule: the printed game grants its re-rolls through the
   goose squares, never through the dice. Everything here is therefore a
   decision, not a reading of the rules, and it is all opt-in. */
const on = (config: Partial<TableConfig> = {}): Partial<TableConfig> => ({
  doubleAgain: true,
  ...config,
})

/** A game with the house rule on and `streak` doubles already behind it. */
function afterDoubles(streak: number, config: Partial<TableConfig> = {}): GameState {
  return { ...gameAt([1, 0], on(config)), consecutiveDoubles: streak }
}

describe('applyRoll, the doubles house rule', () => {
  it('gives the same seat another roll and says why', () => {
    const { state, steps } = applyRoll(gameAt([1, 0], on()), [1, 1])
    expect(state.turn).toBe(0)
    expect(state.positions[0]).toBe(3)
    expect(state.consecutiveDoubles).toBe(1)
    expect(steps.at(-1)).toEqual({ kind: 'double', seat: 0, dice: [1, 1] })
  })

  it('passes the turn on anything that is not a double', () => {
    const { state, steps } = applyRoll(gameAt([1, 0], on()), [1, 2])
    expect(state.turn).toBe(1)
    expect(state.consecutiveDoubles).toBe(0)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('clears the streak when the double run is broken', () => {
    const { state } = applyRoll(afterDoubles(2), [1, 2])
    expect(state.consecutiveDoubles).toBe(0)
    expect(state.turn).toBe(1)
  })

  it('does nothing at all when the rule is off', () => {
    const { state, steps } = applyRoll(gameAt([1, 0], { doubleAgain: false }), [1, 1])
    expect(state.turn).toBe(1)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('does nothing with a single die, where no double exists', () => {
    const { state, steps } = applyRoll(gameAt([1, 0], on({ twoDice: false })), [1])
    expect(state.turn).toBe(1)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('grants nothing to a seat the chain left in the well', () => {
    // 29 + 2 = 31, the well.
    const { state, steps } = applyRoll(gameAt([29, 0], on()), [1, 1])
    expect(state.blocked[0]).toBe('well')
    expect(state.turn).toBe(1)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('grants nothing to a seat the chain left in prison', () => {
    // 50 + 2 = 52, the prison.
    const { state, steps } = applyRoll(gameAt([50, 0], on()), [1, 1])
    expect(state.blocked[0]).toBe('prison')
    expect(state.turn).toBe(1)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('grants nothing to a seat waiting at the inn', () => {
    // 17 + 2 = 19, the inn.
    const { state, steps } = applyRoll(gameAt([17, 0], on()), [1, 1])
    expect(state.skipTurns[0]).toBe(1)
    expect(state.turn).toBe(1)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('grants nothing to a seat that has just won', () => {
    // 61 + 2 = 63, the garden.
    const { state, steps } = applyRoll(gameAt([61, 0], on()), [1, 1])
    expect(state.winner).toBe(0)
    expect(state.finished).toBe(true)
    expect(steps.some((s) => s.kind === 'double')).toBe(false)
  })

  it('caps a run at three and never lets one seat hold the table', () => {
    expect(MAX_CONSECUTIVE_DOUBLES).toBe(3)
    let state = gameAt([1, 0], on())
    let rolls = 0
    while (state.turn === 0 && rolls < 10) {
      state = applyRoll(state, [1, 1]).state
      rolls++
    }
    expect(rolls).toBe(MAX_CONSECUTIVE_DOUBLES)
    expect(state.turn).toBe(1)
  })
})

describe('the third consecutive double', () => {
  it('only passes the turn under pass, leaving the two gains standing', () => {
    const start = afterDoubles(2, { tripleDouble: 'pass' })
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.positions[0]).toBe(3)
    expect(state.turn).toBe(1)
    expect(state.consecutiveDoubles).toBe(0)
    expect(steps.at(-1)).toEqual({
      kind: 'tripleDouble',
      seat: 0,
      outcome: 'pass',
      from: 3,
      to: 3,
    })
  })

  it('sends the seat back to the start under restart', () => {
    const start = afterDoubles(2, { tripleDouble: 'restart' })
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.positions[0]).toBe(0)
    expect(state.turn).toBe(1)
    expect(state.consecutiveDoubles).toBe(0)
    expect(steps.at(-1)).toEqual({
      kind: 'tripleDouble',
      seat: 0,
      outcome: 'restart',
      from: 3,
      to: 0,
    })
  })

  it('leaves hasRolled alone, so square 0 does not re-arm the opening nine', () => {
    const start = afterDoubles(2, { tripleDouble: 'restart', opening9: true })
    const { state } = applyRoll(start, [1, 1])
    expect(state.positions[0]).toBe(0)
    expect(state.hasRolled[0]).toBe(true)

    /* And the consequence, stated rather than hidden: a nine from square 0 is
       a goose chain to 63. A seat sent home by the third double can win on
       the very next roll. That is the owner's call, not an accident. */
    const back = applyRoll({ ...state, turn: 0 }, [6, 3]).state
    expect(back.positions[0]).not.toBe(26)
    expect(back.positions[0]).toBe(63)
  })

  it('never fires on a fresh table, only after two doubles in a row', () => {
    const { steps } = applyRoll(createGame(2, { doubleAgain: true }), [2, 2])
    expect(steps.some((s) => s.kind === 'tripleDouble')).toBe(false)
  })
})
