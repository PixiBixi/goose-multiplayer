import { describe, expect, it } from 'vitest'
import { makeRoomCode } from './room-code.js'

describe('makeRoomCode', () => {
  it('produces six characters from an unambiguous alphabet', () => {
    for (let i = 0; i < 500; i++) {
      expect(makeRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    }
  })

  it('omits the characters that get misread aloud', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 3000; i++) for (const c of makeRoomCode()) seen.add(c)
    for (const c of ['O', '0', 'I', '1', 'L']) expect(seen.has(c)).toBe(false)
  })

  it('practically never repeats itself', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => makeRoomCode()))
    expect(codes.size).toBeGreaterThan(1990)
  })

  it('uses more than a handful of distinct first characters', () => {
    const firsts = new Set(Array.from({ length: 500 }, () => makeRoomCode()[0]))
    expect(firsts.size).toBeGreaterThan(10)
  })
})
