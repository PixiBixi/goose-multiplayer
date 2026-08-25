import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './http.js'

/* The client build, which CI always produces before it runs the tests. A fresh
   clone that has not built yet has no assets to ask about, so the two cache
   tests below stand down rather than failing on a missing directory. */
const WEB_DIST = join(import.meta.dirname, '../../web/dist')
const ASSETS = join(WEB_DIST, 'assets')
const built = existsSync(ASSETS)
const anAsset = built ? (readdirSync(ASSETS).find((name) => name.endsWith('.js')) ?? '') : ''

describe('http', () => {
  it('answers the health probe', async () => {
    const res = await request(createApp()).get('/healthz')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns 404 on an unknown api route', async () => {
    const res = await request(createApp()).get('/api/nope')
    expect(res.status).toBe(404)
  })

  /* The bundle is content-hashed, so its name is its version: revalidating it
     on every load is pure waste, and the browser is told never to ask again. */
  it.skipIf(!built || anAsset === '')('lets the hashed assets be cached for good', async () => {
    const res = await request(createApp()).get(`/assets/${anAsset}`)
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toContain('immutable')
    expect(res.headers['cache-control']).toContain('max-age=31536000')
  })

  /* And the other half, which matters more: index.html is what points at those
     hashes. Cache it and the deploy becomes invisible. */
  it.skipIf(!built)('keeps index.html revalidating on every load', async () => {
    const res = await request(createApp()).get('/')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=0')
    expect(res.headers['etag']).toBeDefined()
  })
})
