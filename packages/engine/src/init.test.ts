import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, MAX_SEATS, MIN_SEATS, createGame } from './init.js'

describe('createGame', () => {
  it('starts every seat off the board, unblocked and free to play', () => {
    const s = createGame(4)
    expect(s.positions).toEqual([0, 0, 0, 0])
    expect(s.blocked).toEqual([null, null, null, null])
    expect(s.blockedTurns).toEqual([0, 0, 0, 0])
    expect(s.skipTurns).toEqual([0, 0, 0, 0])
    expect(s.consecutiveDoubles).toBe(0)
    expect(s.turn).toBe(0)
    expect(s.winner).toBeNull()
    expect(s.finished).toBe(false)
  })

  it('defaults to the historic rules with two dice, and to a way out of the traps', () => {
    expect(DEFAULT_CONFIG).toEqual({
      exactFinish: true,
      twoDice: true,
      rescue: true,
      opening9: true,
      doubleAgain: true,
      tripleDouble: 'pass',
      maxBlockedTurns: 3,
      escapeOnDouble: true,
      mode: 'classic',
    })
  })

  /* The measured reason, kept next to the value: rescue alone left 56% of two
     player games ending with a seat still in the hole. A default of `null`
     here is that number coming back. */
  it('caps the wait rather than leaving rescue as the only door', () => {
    expect(DEFAULT_CONFIG.maxBlockedTurns).toBe(3)
    expect(DEFAULT_CONFIG.escapeOnDouble).toBe(true)
  })

  it('takes a partial config override', () => {
    expect(createGame(2, { twoDice: false }).config.twoDice).toBe(false)
    expect(createGame(2, { twoDice: false }).config.rescue).toBe(true)
  })

  it('carries no hands in classic mode', () => {
    expect(createGame(2).hands).toBeUndefined()
  })

  it('refuses a seat count outside two to six', () => {
    expect(MIN_SEATS).toBe(2)
    expect(MAX_SEATS).toBe(6)
    expect(() => createGame(1)).toThrow(/seat count/i)
    expect(() => createGame(7)).toThrow(/seat count/i)
  })
})
