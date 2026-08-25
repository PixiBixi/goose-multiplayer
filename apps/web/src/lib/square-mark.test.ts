import { describe, expect, it } from 'vitest'
import { markFor } from './square-mark.js'

describe('markFor', () => {
  it('reads the tone straight off the engine board, never off a local copy', () => {
    expect(markFor(5).tone).toBe('goose')
    expect(markFor(6).tone).toBe('move')
    expect(markFor(19).tone).toBe('trap')
    expect(markFor(31).tone).toBe('trap')
    expect(markFor(58).tone).toBe('death')
    expect(markFor(63).tone).toBe('garden')
    expect(markFor(2).tone).toBe('plain')
  })

  it('gives every special square an icon, so colour is never the only cue', () => {
    for (const square of [5, 6, 19, 26, 31, 42, 52, 53, 58, 63]) {
      expect(markFor(square).icon, `square ${square} has no icon`).not.toBeNull()
    }
    expect(markFor(2).icon).toBeNull()
  })

  it('tells the well and the prison apart', () => {
    expect(markFor(31).icon).toBe('well')
    expect(markFor(52).icon).toBe('prison')
  })
})
