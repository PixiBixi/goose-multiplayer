import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { precompressDir } from './precompress.js'

const fixture = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'precompress-'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'index.html'), '<html>'.repeat(500))
  writeFileSync(join(dir, 'assets', 'app-1.js'), 'const a = 1\n'.repeat(500))
  writeFileSync(join(dir, 'assets', 'app-1.css'), 'a{color:red}'.repeat(200))
  writeFileSync(join(dir, 'tiny.js'), 'x')
  writeFileSync(join(dir, 'logo.png'), 'not text'.repeat(500))
  return dir
}

describe('precompressDir', () => {
  it('writes a brotli and a gzip sibling that decompress to the original', () => {
    const dir = fixture()
    precompressDir(dir)
    const original = readFileSync(join(dir, 'assets', 'app-1.js'))
    expect(brotliDecompressSync(readFileSync(join(dir, 'assets', 'app-1.js.br')))).toEqual(original)
    expect(gunzipSync(readFileSync(join(dir, 'assets', 'app-1.js.gz')))).toEqual(original)
    expect(existsSync(join(dir, 'index.html.br'))).toBe(true)
    expect(existsSync(join(dir, 'assets', 'app-1.css.gz'))).toBe(true)
  })

  it('leaves tiny files and non-text files alone', () => {
    const dir = fixture()
    precompressDir(dir)
    expect(existsSync(join(dir, 'tiny.js.br'))).toBe(false)
    expect(existsSync(join(dir, 'logo.png.br'))).toBe(false)
  })
})
