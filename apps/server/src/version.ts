import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/* The version this process is running, read once at boot from the changelog
   `cog bump` writes. The twin of scripts/app-version.ts, which reads the same
   file at build time so the client can bake in the version its bundle was
   built as: the two are held together by version.test.ts, and the client
   compares them to know its tab has been left open across a deploy.

   Not imported from that script because the server compiles with rootDir src
   and must not reach outside it. Keep the regex identical or the test fails,
   which is the point of the test.

   The changelog sits at the repository root, three levels above dist/. The
   Dockerfile copies it next to the server for exactly this read; without it
   the version is 'dev' and the client simply never raises the banner. */
const CHANGELOG = join(import.meta.dirname, '../../../CHANGELOG.md')

function read(): string {
  try {
    return /^## \[(v[^\]]+)\]/m.exec(readFileSync(CHANGELOG, 'utf8'))?.[1] ?? 'dev'
  } catch {
    return 'dev'
  }
}

export const APP_VERSION = read()
