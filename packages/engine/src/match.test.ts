import { describe, expect, it } from 'vitest'
import { ranking, restart } from './match.js'
import { gameAt } from './test-helpers.js'

describe('match', () => {
  it('ranks by position, furthest first', () => {
    expect(ranking(gameAt([12, 40, 3]))).toEqual([1, 0, 2])
  })

  it('puts the winner first whatever the positions say', () => {
    const won = { ...gameAt([63, 62]), winner: 0, finished: true }
    expect(ranking(won)[0]).toBe(0)
  })

  it('leads with the winner even when its pawn is behind', () => {
    // An inexact finish can win from a square other seats have passed.
    const won = { ...gameAt([40, 30, 5]), winner: 2, finished: true }
    expect(ranking(won)).toEqual([2, 0, 1])
  })

  it('resets positions and flags but keeps the seats and the config', () => {
    const played = { ...gameAt([30, 20], { twoDice: false }), winner: 0, finished: true }
    const fresh = restart(played)
    expect(fresh.positions).toEqual([0, 0])
    expect(fresh.blocked).toEqual([null, null])
    expect(fresh.skipTurns).toEqual([0, 0])
    expect(fresh.hasRolled).toEqual([false, false])
    expect(fresh.finished).toBe(false)
    expect(fresh.winner).toBeNull()
    expect(fresh.turn).toBe(0)
    expect(fresh.seatCount).toBe(2)
    expect(fresh.config.twoDice).toBe(false)
  })
})
