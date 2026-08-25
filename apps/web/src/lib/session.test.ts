import { describe, expect, it } from 'vitest'
import { forgetSession, sessionToken } from './session.js'

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
