import { makeRng } from '@goose/engine'
import { describe, expect, it, vi } from 'vitest'
import { RoomManager, TURN_TIMEOUT_MS } from './room-manager.js'

/* A clock the test drives by hand. Nothing here ever waits: a suite that
   sleeps for a timeout is a suite nobody runs on every commit. */
function fakeClock() {
  let time = 0
  const timers = new Map<symbol, { at: number; fn: () => void }>()
  return {
    now: () => time,
    setTimeout(fn: () => void, ms: number) {
      const handle = Symbol('timer')
      timers.set(handle, { at: time + ms, fn })
      return handle
    },
    clearTimeout(handle: symbol) {
      timers.delete(handle)
    },
    advance(ms: number) {
      time += ms
      for (const [handle, t] of [...timers]) {
        if (t.at <= time) {
          timers.delete(handle)
          t.fn()
        }
      }
    },
  }
}

function manager() {
  const clock = fakeClock()
  const onView = vi.fn()
  const m = new RoomManager({ clock, rng: makeRng(1), onView })
  return { m, clock, onView }
}

describe('RoomManager', () => {
  it('rolls for an absent seat once the turn times out', () => {
    const { m, clock } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    expect(m.get(code)?.view(0).turn.seat).toBe(0)

    clock.advance(TURN_TIMEOUT_MS)

    // A goose turn has exactly one legal action, so auto-playing decides
    // nothing for the absent player. This is the difference with uno.
    expect(m.get(code)?.view(0).lastTurn?.seat).toBe(0)
    expect(m.get(code)?.view(0).turn.seat).toBe(1)
  })

  it('cancels the turn timer when the seat rolls in time', () => {
    const { m, clock } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    m.roll(code, 0)
    const after = m.get(code)?.view(0).lastTurn
    clock.advance(TURN_TIMEOUT_MS * 3)
    expect(m.get(code)?.view(0).lastTurn?.dice).toEqual(after?.dice)
  })

  it('publishes a view after every state change', () => {
    const { m, onView } = manager()
    const code = m.create('a', 's0')
    onView.mockClear()
    m.join(code, 'b', 's1')
    expect(onView).toHaveBeenCalledWith(code)
  })

  /* Every die a 1, so every roll is a double and the house rule fires on
     every turn. A seeded rng would make this test a story about luck. */
  const alwaysOnes = () => 0

  it('lets the seat that rolled a double roll again instead of passing the turn', () => {
    const clock = fakeClock()
    const m = new RoomManager({ clock, rng: alwaysOnes, onView: () => {} })
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)

    m.roll(code, 0)
    expect(m.get(code)?.view(0).turn.seat).toBe(0)
    expect(m.get(code)?.view(0).lastTurn?.steps.at(-1)).toEqual({
      kind: 'double',
      seat: 0,
      dice: [1, 1],
    })

    m.roll(code, 0)
    expect(m.get(code)?.view(0).turn.seat).toBe(0)

    // The third is the cap: the turn passes whatever the dice said.
    m.roll(code, 0)
    expect(m.get(code)?.view(0).turn.seat).toBe(1)
    expect(() => {
      m.roll(code, 0)
    }).toThrow(/turn/i)
  })

  it('keeps the turn timer on the seat that is still on turn after a double', () => {
    const clock = fakeClock()
    const m = new RoomManager({ clock, rng: alwaysOnes, onView: () => {} })
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)

    // Nobody acts. The timer rolls for seat 0, which doubles and keeps the
    // turn, so the next timer has to be armed for seat 0 again, not for 1.
    clock.advance(TURN_TIMEOUT_MS)
    expect(m.get(code)?.view(0).turn.seat).toBe(0)
    clock.advance(TURN_TIMEOUT_MS)
    expect(m.get(code)?.view(0).turn.seat).toBe(0)
    clock.advance(TURN_TIMEOUT_MS)
    expect(m.get(code)?.view(0).turn.seat).toBe(1)
  })

  it('replays the same game from the same seed', () => {
    const play = () => {
      const clock = fakeClock()
      const m = new RoomManager({ clock, rng: makeRng(42), onView: () => {} })
      const code = m.create('a', 's0')
      m.join(code, 'b', 's1')
      m.start(code, 0)
      for (let i = 0; i < 20; i++) {
        const view = m.get(code)?.view(0)
        if (!view || view.phase === 'over') break
        m.roll(code, view.turn.seat)
      }
      return m
        .get(code)
        ?.view(0)
        .seats.map((s) => s.position)
    }
    expect(play()).toEqual(play())
  })
})
