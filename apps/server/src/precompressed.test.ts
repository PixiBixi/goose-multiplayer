import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { createApp } from './http.js'

/* A built client in miniature: the same layout vite writes, plus the .br and
   .gz siblings scripts/precompress.ts adds. */
const dist = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'))
  mkdirSync(join(dir, 'assets'))
  const files: Record<string, string> = {
    'index.html': '<!doctype html><title>goose</title>'.repeat(100),
    'assets/app-1.js': 'console.log("goose")\n'.repeat(200),
  }
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text)
    writeFileSync(join(dir, `${name}.br`), brotliCompressSync(Buffer.from(text)))
    writeFileSync(join(dir, `${name}.gz`), gzipSync(Buffer.from(text)))
  }
  writeFileSync(join(dir, 'favicon.svg'), '<svg/>')
  return dir
}

const asset = (app: ReturnType<typeof createApp>, encoding: string) =>
  request(app).get('/assets/app-1.js').set('Accept-Encoding', encoding)

describe('precompressed static files', () => {
  it('serves brotli to a client that accepts it, with the original type', async () => {
    const res = await asset(createApp(dist()), 'gzip, br')
    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBe('br')
    expect(res.headers['content-type']).toMatch(/javascript/)
    expect(res.headers['vary']).toMatch(/Accept-Encoding/i)
    expect(res.text).toContain('console.log("goose")')
  })

  it('falls back to gzip, then to the plain file', async () => {
    const app = createApp(dist())
    expect((await asset(app, 'gzip')).headers['content-encoding']).toBe('gzip')
    const plain = await asset(app, 'identity')
    expect(plain.headers['content-encoding']).toBeUndefined()
    expect(plain.text).toContain('console.log("goose")')
  })

  it('keeps the cache rules: hashed assets forever, index.html revalidated', async () => {
    const app = createApp(dist())
    expect((await asset(app, 'br')).headers['cache-control']).toContain('immutable')
    const index = await request(app).get('/').set('Accept-Encoding', 'br')
    expect(index.headers['content-encoding']).toBe('br')
    expect(index.headers['cache-control']).toBe('public, max-age=0')
  })

  it('compresses the SPA fallback too', async () => {
    const res = await request(createApp(dist())).get('/room/ABC123').set('Accept-Encoding', 'br')
    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBe('br')
    expect(res.text).toContain('<title>goose</title>')
  })

  it('leaves a file with no compressed copy alone, and cannot be walked out of the root', async () => {
    const app = createApp(dist())
    const svg = await request(app).get('/favicon.svg').set('Accept-Encoding', 'br')
    expect(svg.status).toBe(200)
    expect(svg.headers['content-encoding']).toBeUndefined()
    // Whatever the escape resolves to, it is the SPA's index.html and not a file outside the root.
    const escape = await request(app)
      .get('/assets/..%2f..%2f..%2f..%2fetc%2fhosts')
      .set('Accept-Encoding', 'br')
    expect(escape.text).toContain('<title>goose</title>')
  })
})
