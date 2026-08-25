import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from './index.js'

describe('engine surface', () => {
  it('exposes the board size', () => {
    expect(BOARD_SIZE).toBe(63)
  })
})
