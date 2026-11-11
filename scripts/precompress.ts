import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const TEXT = new Set(['.html', '.js', '.css', '.svg', '.json'])
// Under this a compressed copy saves less than the header it needs.
const MIN_BYTES = 1024

/* Writes a .br and a .gz beside every text file in the build output, once, so
   the server sends the smallest one with no per-request CPU. Run by the vite
   build (apps/web/vite.config.ts) and served by apps/server/src/precompressed.ts. */
export function precompressDir(dir: string): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      precompressDir(path)
      continue
    }
    if (!TEXT.has(extname(name))) continue
    const body = readFileSync(path)
    if (body.length < MIN_BYTES) continue
    writeFileSync(
      `${path}.br`,
      brotliCompressSync(body, {
        params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY },
      }),
    )
    writeFileSync(`${path}.gz`, gzipSync(body, { level: 9 }))
  }
}
