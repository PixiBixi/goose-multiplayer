import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './http.js'

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
})
