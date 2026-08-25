import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('defaults the port to 5050', () => {
    // Not 5000: macOS Control Center binds it for the AirPlay receiver, so a
    // 5000 default fails on any Mac with AirPlay on.
    expect(loadConfig({}).port).toBe(5050)
  })

  it('defaults BEHIND_TLS to false', () => {
    expect(loadConfig({}).behindTls).toBe(false)
    expect(loadConfig({ BEHIND_TLS: 'true' }).behindTls).toBe(true)
  })

  it('rejects a port that is not a number', () => {
    expect(() => loadConfig({ PORT: 'nope' })).toThrow(/PORT/)
  })
})
