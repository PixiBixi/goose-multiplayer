import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, MAX_SEATS, MIN_SEATS, createGame } from './init.js'

describe('createGame', () => {
  it('starts every seat off the board, unblocked and free to play', () => {
    const s = createGame(4)
    expect(s.positions).toEqual([0, 0, 0, 0])
    expect(s.blocked).toEqual([null, null, null, null])
    expect(s.skipTurns).toEqual([0, 0, 0, 0])
    expect(s.hasRolled).toEqual([false, false, false, false])
    expect(s.consecutiveDoubles).toBe(0)
    expect(s.turn).toBe(0)
    expect(s.winner).toBeNull()
    expect(s.finished).toBe(false)
  })

  it('defaults to the historic rules with two dice', () => {
    expect(DEFAULT_CONFIG).toEqual({
      exactFinish: true,
      twoDice: true,
      rescue: true,
      opening9: true,
      doubleAgain: true,
      tripleDouble: 'pass',
      mode: 'classic',
    })
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
