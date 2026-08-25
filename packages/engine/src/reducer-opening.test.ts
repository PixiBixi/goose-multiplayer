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

  it('only applies to a nine thrown from the start square', () => {
    const first = applyRoll(opening(), [1, 1]).state
    expect(first.positions[0]).toBe(2)
    const second = applyRoll({ ...first, turn: 0 }, [6, 3]).state
    expect(second.positions[0]).not.toBe(26)
    expect(second.positions[0]).toBe(11)
  })

  it('applies again to a seat sent back to the start mid-game', () => {
    /* The rule is about the geometry, not about a turn counter: a nine from 0
       reaches 63 whoever throws it. A seat the third-double rule sent home has
       that same shot, so the same guard has to cover it. */
    const home = { ...createGame(2, { opening9: true }), positions: [0, 30], turn: 0 }
    const { state } = applyRoll(home, [5, 4])
    expect(state.positions[0]).toBe(53)
    expect(state.winner).toBeNull()
  })

  it('is what stops a nine from winning on the first roll', () => {
    // Without the rule, 0 + 9 is a goose, and every re-advance of nine lands
    // on the next goose: 9, 18, 27, 36, 45, 54, then 63. That instant win is
    // the whole reason the opening nine exists, and why it ships on.
    const { state } = applyRoll(createGame(2, { opening9: false }), [6, 3])
    expect(state.positions[0]).toBe(63)
    expect(state.winner).toBe(0)
  })

  it('leaves no roll from the start square winning outright, ever', () => {
    // The regression guard for the default. Four of these thirty-six used to
    // end the game before the second seat had played, and four of them used to
    // do it again for a seat the third-double rule had sent home.
    const fresh = () => createGame(2)
    const restarted = () => ({ ...createGame(2), positions: [0, 42], turn: 0 })
    for (const start of [fresh, restarted]) {
      for (let a = 1; a <= 6; a++) {
        for (let b = 1; b <= 6; b++) {
          const { state } = applyRoll(start(), [a, b])
          expect(state.winner, `dice ${a}+${b}`).toBeNull()
          expect(state.finished, `dice ${a}+${b}`).toBe(false)
        }
      }
    }
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
