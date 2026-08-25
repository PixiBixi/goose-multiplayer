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
    /* Two rules, and getting them the wrong way round is how a deploy stays
       invisible for a week.

       /assets holds the files vite content-hashes: index-BSmTx1hc.js can never
       change under that name, so it is cached for a year and `immutable` stops
       the browser revalidating it at all.

       index.html is the file that POINTS at those hashes, so it keeps
       max-age=0 and revalidates on every load. It is served both by the static
       mount below and by the SPA fallback, and neither adds a max-age. */
    app.use('/assets', express.static(join(WEB_DIST, 'assets'), { maxAge: '1y', immutable: true }))
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
