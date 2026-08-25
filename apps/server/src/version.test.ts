import { describe, expect, it } from 'vitest'
import { appVersion, versionIn } from '../../../scripts/app-version.js'
import { APP_VERSION } from './version.js'

describe('APP_VERSION', () => {
  /* The whole point of the pair: the server reads the changelog at boot and
     the client bakes it in at build time from scripts/app-version.ts. They are
     two readers of one file, and the day they disagree every tab in the world
     is told a new version is out. */
  it('agrees with the reader the client build uses', () => {
    expect(APP_VERSION).toBe(appVersion())
  })

  it('reads the version cog stamped, and nothing else on the line', () => {
    const changelog = '## [v1.2.3](https://example.test/compare) - 2026-08-25\n#### Features\n'
    expect(versionIn(changelog)).toBe('v1.2.3')
  })

  it('says dev when no release has been stamped yet', () => {
    expect(versionIn('# Changelog\n\nnothing released\n')).toBe('dev')
  })
})
