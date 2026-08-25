import type { Rng } from '@goose/engine'
import { describe, expect, it, vi } from 'vitest'
import { DISCONNECT_GRACE_MS, RoomManager } from './room-manager.js'

/* Same driven-by-hand clock as room-manager.test.ts: nothing here waits on a
   real timer, so the suite stays fast on every run. */
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

/* Dice that alternate 1 and 4, so no roll is ever a double. These tests are
   about the grace period and the turn moving on without an absent seat; the
   doubles house rule keeping the turn on the roller would quietly make the
   fixture say something else. */
function neverDoubles(): Rng {
  let call = 0
  return () => (call++ % 2 === 0 ? 0 : 0.5)
}

function manager() {
  const clock = fakeClock()
  const onView = vi.fn()
  const m = new RoomManager({ clock, rng: neverDoubles(), onView })
  return { m, clock, onView }
}

describe('RoomManager, presence', () => {
  it('marks a seat disconnected without freeing it', () => {
    const { m } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)

    m.disconnect(code, 1)

    const view = m.get(code)?.view(0)
    expect(view?.seats[1]?.presence).toBe('disconnected')
    expect(view?.seats).toHaveLength(2)
  })

  it('recovers the seat on a reconnect with the same session id', () => {
    const { m } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    m.disconnect(code, 1)

    const seat = m.reconnect(code, 's1')

    expect(seat).toBe(1)
    expect(m.get(code)?.view(0).seats[1]?.presence).toBe('active')
  })

  it('does not free the seat and does not resolve its turn before the grace period elapses', () => {
    const { m, clock } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    m.roll(code, 0)
    m.disconnect(code, 1)

    clock.advance(DISCONNECT_GRACE_MS - 1)

    const view = m.get(code)?.view(0)
    expect(view?.seats[1]?.presence).toBe('disconnected')
    expect(view?.turn.seat).toBe(1)
  })

  it('frees the seat to left after the grace period, and the turn stops waiting on it', () => {
    const { m, clock } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    m.roll(code, 0)
    m.disconnect(code, 1)

    clock.advance(DISCONNECT_GRACE_MS)

    const view = m.get(code)?.view(0)
    expect(view?.seats[1]?.presence).toBe('left')
    // Resolved the instant the grace period elapsed, not after a further
    // TURN_TIMEOUT_MS wait: the turn already moved past seat 1.
    expect(view?.lastTurn?.seat).toBe(1)
    expect(view?.turn.seat).toBe(0)
  })
})
