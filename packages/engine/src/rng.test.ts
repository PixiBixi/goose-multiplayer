import { describe, expect, it } from 'vitest'
import { deckState, makeDeckRng, makeRng, nextDeckRandom, rollDice } from './rng.js'

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

describe('dice stream', () => {
  const take = (rng: () => number): number[] => Array.from({ length: 20 }, () => rng())

  it('reads all 128 bits of a seed, not just one word', () => {
    // Seeds that share all but one word: a 32-bit state would roll some of them alike.
    const a = take(makeDeckRng([1, 2, 3, 4]))
    expect(take(makeDeckRng([1, 2, 3, 5]))).not.toEqual(a)
    expect(take(makeDeckRng([9, 2, 3, 4]))).not.toEqual(a)
  })

  it('carries four 32-bit words of state between draws', () => {
    let state = deckState([0xdeadbeef, 0, 0, 0])
    for (let i = 0; i < 100; i++) {
      const r = nextDeckRandom(state)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
      expect(r.state).toHaveLength(4)
      for (const word of r.state) expect(Number.isInteger(word)).toBe(true)
      state = r.state
    }
  })

  it('expands a numeric seed deterministically, so tests and replays stay stable', () => {
    expect(deckState(42)).toEqual(deckState(42))
    expect(deckState(42)).not.toEqual(deckState(43))
    expect(take(makeDeckRng(42))).toEqual(take(makeDeckRng(42)))
  })

  it('rolls fair dice from the stream', () => {
    const rng = makeDeckRng([7, 8, 9, 10])
    const counts = new Array<number>(7).fill(0)
    for (let i = 0; i < 6000; i++)
      for (const d of rollDice(rng, 1)) counts[d] = (counts[d] ?? 0) + 1
    for (let face = 1; face <= 6; face++) expect(counts[face]).toBeGreaterThan(800)
  })
})
