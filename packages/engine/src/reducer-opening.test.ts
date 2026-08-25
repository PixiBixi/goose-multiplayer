import { describe, expect, it } from 'vitest'
import { createGame } from './init.js'
import { applyRoll } from './reducer.js'

describe('the opening nine', () => {
  const opening = () => createGame(2, { opening9: true })

  it('sends six and three to twenty-six', () => {
    const { state } = applyRoll(opening(), [6, 3])
    expect(state.positions[0]).toBe(26)
  })

  it('sends five and four to fifty-three', () => {
    const { state } = applyRoll(opening(), [5, 4])
    expect(state.positions[0]).toBe(53)
  })

  it('only applies on the very first roll of a seat', () => {
    const first = applyRoll(opening(), [1, 1]).state
    const second = applyRoll({ ...first, turn: 0 }, [6, 3]).state
    expect(second.positions[0]).not.toBe(26)
  })

  it('is what stops a nine from winning on the first roll', () => {
    // Without the rule, 0 + 9 is a goose, and every re-advance of nine lands
    // on the next goose: 9, 18, 27, 36, 45, 54, then 63. That instant win is
    // the whole reason the opening nine exists.
    const { state } = applyRoll(createGame(2), [6, 3])
    expect(state.positions[0]).toBe(63)
    expect(state.winner).toBe(0)
  })

  it('plays a single die when two dice are off', () => {
    const { state } = applyRoll(createGame(2, { twoDice: false }), [4])
    expect(state.positions[0]).toBe(4)
  })

  it('leaves the opening square to resolve nothing of its own', () => {
    // 26 is a dice square. The opening nine places the pawn there, it does not
    // send it on to 53.
    const { state, steps } = applyRoll(opening(), [6, 3])
    expect(steps).toEqual([{ kind: 'move', from: 0, to: 26, by: 9 }])
    expect(state.turn).toBe(1)
  })
})
