import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from './origin.js'

describe('isAllowedOrigin', () => {
  it('lets a non-browser client through, since it sends no Origin', () => {
    expect(isAllowedOrigin(undefined, 'goose.example.com', null)).toBe(true)
  })

  it('accepts the page the server itself serves', () => {
    expect(isAllowedOrigin('https://goose.example.com', 'goose.example.com', null)).toBe(true)
    expect(isAllowedOrigin('http://localhost:5050', 'localhost:5050', null)).toBe(true)
  })

  it('accepts the configured CORS origin', () => {
    expect(
      isAllowedOrigin('http://localhost:5173', 'localhost:5050', 'http://localhost:5173'),
    ).toBe(true)
  })

  it('refuses a page on another site', () => {
    // A WebSocket upgrade is exempt from CORS, so this is the only thing stopping it.
    expect(isAllowedOrigin('https://evil.example', 'goose.example.com', null)).toBe(false)
    expect(isAllowedOrigin('null', 'goose.example.com', null)).toBe(false)
  })
})
