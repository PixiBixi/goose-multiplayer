import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

describe('tokens', () => {
  it('declares the risograph inks the board reads from', () => {
    for (const token of [
      '--ink',
      '--paper',
      '--paper-raised',
      '--pink',
      '--teal',
      '--ochre',
      '--blue',
      '--gold',
    ]) {
      expect(css).toContain(`${token}:`)
    }
  })

  it('uses no ui-* font generic', () => {
    // One unsupported generic invalidates the whole font-family declaration.
    // Chrome dropped ui-rounded and rendered every heading in its default serif.
    expect(css).not.toMatch(/\bui-(rounded|serif|sans-serif|monospace)\b/)
  })

  it('points at no font file, because the faces come from the stylesheet link', () => {
    // A @font-face pointing at a file that does not exist falls back silently.
    expect(css).not.toContain('@font-face')
  })
})
