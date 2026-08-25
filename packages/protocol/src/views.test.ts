import { describe, expect, it } from 'vitest'
import { STEP_KINDS } from './views.js'
import type { TableView, UnlistedStepKind } from './views.js'

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

  it('carries every step kind the engine names', () => {
    /* A compile-time check wearing a test's clothes: `never[]` accepts the
       empty union and nothing else, so a rule the engine names and the wire
       forgets stops the build here rather than reaching a browser as a step
       no client knows how to narrate. */
    const unlisted: never[] = [] as UnlistedStepKind[]
    expect(unlisted).toEqual([])
    expect(new Set(STEP_KINDS).size).toBe(STEP_KINDS.length)
  })
})
