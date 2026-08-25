/// <reference types="node" />
/* The root tsconfig does not set `types`, and TypeScript 6 no longer pulls
   @types/node in on its own. Referenced here rather than in a root config,
   which this package does not own. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/* The engine is pure. This is what makes the rules testable, replayable and
   reusable in a browser, and it is easier to keep than to restore. */
describe('engine purity', () => {
  const dir = new URL('.', import.meta.url).pathname
  const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

  it('imports nothing outside itself', () => {
    for (const file of sources) {
      const text = readFileSync(join(dir, file), 'utf8')
      const imports = [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')
      for (const spec of imports) expect(spec.startsWith('.')).toBe(true)
    }
  })

  it('declares no runtime dependency', () => {
    const pkg = JSON.parse(readFileSync(join(dir, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    expect(pkg.dependencies ?? {}).toEqual({})
  })
})
