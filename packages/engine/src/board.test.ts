import { describe, expect, it } from 'vitest'
import { GEESE, effectAt } from './board.js'

describe('board', () => {
  it('has thirteen geese, every nine squares from five', () => {
    expect(GEESE).toEqual([5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59])
  })

  it('maps every special square to its effect', () => {
    expect(effectAt(6)).toEqual({ kind: 'bridge', to: 12 })
    expect(effectAt(19)).toEqual({ kind: 'inn', turns: 1 })
    expect(effectAt(26)).toEqual({ kind: 'dice', to: 53 })
    expect(effectAt(31)).toEqual({ kind: 'block', reason: 'well' })
    expect(effectAt(42)).toEqual({ kind: 'maze', to: 30 })
    expect(effectAt(52)).toEqual({ kind: 'block', reason: 'prison' })
    expect(effectAt(53)).toEqual({ kind: 'dice', to: 26 })
    expect(effectAt(58)).toEqual({ kind: 'death', to: 1 })
    expect(effectAt(63)).toEqual({ kind: 'garden' })
  })

  it('marks each goose square', () => {
    for (const g of GEESE) expect(effectAt(g)).toEqual({ kind: 'goose' })
  })

  it('returns null on an ordinary square', () => {
    for (const n of [1, 2, 12, 30, 40, 62]) expect(effectAt(n)).toBeNull()
  })
})
