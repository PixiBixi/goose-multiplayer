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

  it('defaults the per-IP limits and reads them from the environment', () => {
    expect(loadConfig({})).toMatchObject({
      createBurst: 3,
      createPerSecond: 0.1,
      maxRoomsPerIp: 10,
      joinBurst: 10,
      joinPerSecond: 0.5,
    })
    expect(loadConfig({ MAX_ROOMS_PER_IP: '2', JOIN_PER_SECOND: '0.25' })).toMatchObject({
      maxRoomsPerIp: 2,
      joinPerSecond: 0.25,
    })
  })

  it('rejects a limit that is not a positive number', () => {
    expect(() => loadConfig({ MAX_ROOMS_PER_IP: '0' })).toThrow(/MAX_ROOMS_PER_IP/)
    expect(() => loadConfig({ CREATE_BURST: '1.5' })).toThrow(/CREATE_BURST/)
  })
})
