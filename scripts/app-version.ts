import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/* The version the release stamps, read from the only file that carries it.
   `cog bump` writes the heading below and the tag beside it, and nothing else
   in this repository holds a version number: no second one to keep in step,
   and nothing to hand-maintain.

   Read at build time by apps/web/vite.config.ts, which bakes it into the
   bundle, and at boot by apps/server/src/version.ts, which reads the same file
   the same way. Those two are what the client compares to know its tab has
   been left open across a deploy. */
const CHANGELOG = new URL('../CHANGELOG.md', import.meta.url)

/** 'v0.5.0' off the first release heading, 'dev' before the first bump. */
export function versionIn(changelog: string): string {
  return /^## \[(v[^\]]+)\]/m.exec(changelog)?.[1] ?? 'dev'
}

export function appVersion(): string {
  try {
    return versionIn(readFileSync(fileURLToPath(CHANGELOG), 'utf8'))
  } catch {
    /* A checkout or an image without the changelog beside it still starts, and
       a version nobody can read simply never raises the banner. */
    return 'dev'
  }
}
