import { describe, expect, it } from 'vitest'
import { forgetSession, rememberTable, rememberedTable, sessionToken } from './session.js'

describe('sessionToken', () => {
  it('mints once and hands the same token back', () => {
    forgetSession()
    const first = sessionToken()
    expect(first.length).toBeGreaterThan(0)
    expect(sessionToken()).toBe(first)
  })

  it('survives a reload, which is the whole point of it', () => {
    forgetSession()
    const first = sessionToken()
    expect(window.localStorage.getItem('goose.session')).toBe(first)
  })

  it('stays inside the sixty-four characters the wire accepts', () => {
    forgetSession()
    expect(sessionToken().length).toBeLessThanOrEqual(64)
  })

  it('mints a different token for a different browser profile', () => {
    forgetSession()
    const first = sessionToken()
    forgetSession()
    expect(sessionToken()).not.toBe(first)
  })
})

describe('rememberTable', () => {
  it('keeps the table a reload would otherwise forget', () => {
    forgetSession()
    rememberTable({ code: 'HKD4P2', name: 'Claire' })
    expect(rememberedTable()).toEqual({ code: 'HKD4P2', name: 'Claire' })
  })

  it('forgets it on request, so a dead table stops being retried', () => {
    rememberTable({ code: 'HKD4P2', name: 'Claire' })
    rememberTable(null)
    expect(rememberedTable()).toBeNull()
  })

  it('ignores anything that is not a table', () => {
    window.localStorage.setItem('goose.table', 'not json')
    expect(rememberedTable()).toBeNull()
    window.localStorage.setItem('goose.table', '{"code":42}')
    expect(rememberedTable()).toBeNull()
  })
})
