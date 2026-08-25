import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express, { type Express } from 'express'

/* apps/web is another task's territory: this only reads its build output, and
   only when present, so the server boots fine in dev and in this package's
   own tests before that build exists. */
const WEB_DIST = join(import.meta.dirname, '../../web/dist')

export function createApp(): Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json())

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' })
  })

  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST))
    /* Express 5 runs path-to-regexp 8, which rejects a bare '*': a wildcard
       has to be named. This line only executes once apps/web/dist exists, so
       the throw hid until the client was built. Do NOT shorten it back. */
    app.get('/*splat', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next()
        return
      }
      res.sendFile(join(WEB_DIST, 'index.html'))
    })
  }

  return app
}
