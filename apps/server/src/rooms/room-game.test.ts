import { describe, expect, it } from 'vitest'
import { Room } from './room.js'

function started(): Room {
  const r = new Room('HKD4P2')
  r.join('a', 's0')
  r.join('b', 's1')
  r.start(0)
  return r
}

describe('Room, playing', () => {
  it('refuses a roll from a seat whose turn it is not', () => {
    expect(() => started().roll(1, [1, 1])).toThrow(/turn/i)
  })

  it('records the resolved turn so the client can replay it', () => {
    const r = started()
    r.roll(0, [1, 1])
    const view = r.view(0)
    expect(view.lastTurn?.seat).toBe(0)
    expect(view.lastTurn?.dice).toEqual([1, 1])
    expect(view.lastTurn?.steps[0]).toEqual({ kind: 'move', from: 0, to: 2, by: 2 })
  })

  it('keeps the turn with the seat that rolled a double', () => {
    const r = started()
    r.roll(0, [1, 1])
    expect(r.view(0).turn.seat).toBe(0)
    expect(r.view(0).turn.legalMoves).toEqual(['roll'])
    expect(r.view(0).lastTurn?.steps.at(-1)).toEqual({ kind: 'double', seat: 0, dice: [1, 1] })
  })

  it('passes the turn on a double once the host turns the house rule off', () => {
    // Proves the room hands its config to the engine rather than keeping a
    // private copy of the rules.
    const r = new Room('HKD4P2')
    r.join('a', 's0')
    r.join('b', 's1')
    r.configure(0, { doubleAgain: false })
    r.start(0)
    r.roll(0, [1, 1])
    expect(r.view(0).turn.seat).toBe(1)
  })

  it('offers legal moves only to the seat on turn', () => {
    const r = started()
    expect(r.view(0).turn.legalMoves).toEqual(['roll'])
    expect(r.view(1).turn.legalMoves).toEqual([])
  })

  it('moves to the over phase on a win', () => {
    const r = started()
    // Drive the game to the finish with explicit dice, one roll at a time.
    // [1, 1] is deterministic under the default config and reaches the
    // finish in 23 rolls; [6, 6] cycles forever on the exact-finish rebound
    // and never reaches 'over'. Bounded regardless: an unbounded loop in a
    // suite is a hang, not a failure.
    const MAX_ROLLS = 400
    let rolls = 0
    while (r.view(0).phase !== 'over' && rolls < MAX_ROLLS) {
      const seat = r.view(0).turn.seat
      r.roll(seat, [1, 1])
      rolls++
    }
    expect(rolls).toBeLessThan(MAX_ROLLS)
    expect(r.view(0).winner).not.toBeNull()
    expect(r.view(0).ranking).toHaveLength(2)
  })

  it('restarts with the same seats and the same rules', () => {
    const r = started()
    r.roll(0, [1, 1])
    r.restart(0)
    expect(r.view(0).phase).toBe('playing')
    expect(r.view(0).seats.map((s) => s.position)).toEqual([0, 0])
    expect(r.view(0).lastTurn).toBeNull()
  })

  it('keeps the chat log bounded', () => {
    const r = started()
    for (let i = 0; i < 300; i++) r.chat(0, `line ${i}`)
    expect(r.view(0).chat.length).toBeLessThanOrEqual(200)
    expect(r.view(0).chat.at(-1)?.text).toBe('line 299')
  })
})
