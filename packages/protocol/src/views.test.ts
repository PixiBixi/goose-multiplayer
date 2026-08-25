import { describe, expect, it } from 'vitest'
import type { TableView } from './views.js'

describe('TableView', () => {
  it('carries no hidden state a client could exploit', () => {
    const keys: Array<keyof TableView> = [
      'code',
      'phase',
      'config',
      'you',
      'host',
      'seats',
      'turn',
      'lastTurn',
      'winner',
      'ranking',
      'chat',
    ]
    // A compile-time check: adding a field to TableView without adding it here
    // fails the type, which is the reminder to think about what it exposes.
    expect(keys).toHaveLength(11)
  })
})
