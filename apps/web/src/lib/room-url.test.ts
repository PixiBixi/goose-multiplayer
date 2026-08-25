import { describe, expect, it } from 'vitest'
import { codeFromSearch, urlForRoom } from './room-url.js'

describe('room-url', () => {
  it('reads the table code out of a query string, upper cased', () => {
    expect(codeFromSearch('?table=hkd4p2')).toBe('HKD4P2')
  })

  it('returns null when there is nothing to read', () => {
    expect(codeFromSearch('')).toBeNull()
    expect(codeFromSearch('?table=')).toBeNull()
  })

  it('builds a link a player can paste', () => {
    expect(urlForRoom('http://localhost:5173', '/', 'HKD4P2')).toBe(
      'http://localhost:5173/?table=HKD4P2',
    )
  })
})
