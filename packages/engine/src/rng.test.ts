import { describe, expect, it } from 'vitest'
import { makeRng, rollDice } from './rng.js'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(1234)
    const b = makeRng(1234)
    const left = [a(), a(), a()]
    const right = [b(), b(), b()]
    expect(left).toEqual(right)
  })

  it('stays inside [0, 1)', () => {
    const rng = makeRng(7)
    for (let i = 0; i < 10_000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('rolls the asked number of dice, each between one and six', () => {
    const rng = makeRng(99)
    expect(rollDice(rng, 1)).toHaveLength(1)
    for (let i = 0; i < 2000; i++) {
      for (const d of rollDice(rng, 2)) {
        expect(Number.isInteger(d)).toBe(true)
        expect(d).toBeGreaterThanOrEqual(1)
        expect(d).toBeLessThanOrEqual(6)
      }
    }
  })

  it('reaches every face on both dice', () => {
    const rng = makeRng(5)
    const seen = new Set<number>()
    for (let i = 0; i < 5000; i++) for (const d of rollDice(rng, 2)) seen.add(d)
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })
})
