import { makeRng } from '@goose/engine'
import { describe, expect, it } from 'vitest'
import { makeRoomCode } from './room-code.js'

describe('makeRoomCode', () => {
  it('produces six characters from an unambiguous alphabet', () => {
    const rng = makeRng(1)
    for (let i = 0; i < 500; i++) {
      const code = makeRoomCode(rng)
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    }
  })

  it('omits the characters that get misread aloud', () => {
    const rng = makeRng(2)
    const seen = new Set<string>()
    for (let i = 0; i < 3000; i++) for (const c of makeRoomCode(rng)) seen.add(c)
    for (const c of ['O', '0', 'I', '1', 'L']) expect(seen.has(c)).toBe(false)
  })
})
