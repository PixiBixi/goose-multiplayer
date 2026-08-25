import { describe, expect, it } from 'vitest'
import { makeRateLimiter } from './rate-limit.js'

function fakeClock() {
  let time = 0
  return {
    now: () => time,
    setTimeout: () => Symbol('unused'),
    clearTimeout: () => {},
    advance(ms: number) {
      time += ms
    },
  }
}

describe('makeRateLimiter', () => {
  it('refuses a key once it exceeds its quota', () => {
    const clock = fakeClock()
    const limit = makeRateLimiter({ windowMs: 1000, max: 3, clock })
    expect(limit('a')).toBe(true)
    expect(limit('a')).toBe(true)
    expect(limit('a')).toBe(true)
    expect(limit('a')).toBe(false)
  })

  it('resets the window after windowMs on the injected clock', () => {
    const clock = fakeClock()
    const limit = makeRateLimiter({ windowMs: 1000, max: 1, clock })
    expect(limit('a')).toBe(true)
    expect(limit('a')).toBe(false)
    clock.advance(1000)
    expect(limit('a')).toBe(true)
  })

  it('does not let one key affect another', () => {
    const clock = fakeClock()
    const limit = makeRateLimiter({ windowMs: 1000, max: 1, clock })
    expect(limit('a')).toBe(true)
    expect(limit('b')).toBe(true)
    expect(limit('a')).toBe(false)
    expect(limit('b')).toBe(false)
  })
})
