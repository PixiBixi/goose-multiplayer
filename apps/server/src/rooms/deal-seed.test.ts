import { describe, expect, it } from 'vitest'
import { randomDealSeed } from './deal-seed.js'

const isWord = (word: number): boolean => Number.isInteger(word) && word >= 0 && word < 2 ** 32

describe('randomDealSeed', () => {
  it('draws four full 32-bit words', () => {
    const seed = randomDealSeed()
    expect(seed).toHaveLength(4)
    for (const word of seed) expect(isWord(word)).toBe(true)
  })

  it('never repeats across draws', () => {
    const seen = new Set(Array.from({ length: 100 }, () => randomDealSeed().join(':')))
    expect(seen.size).toBe(100)
  })
})
