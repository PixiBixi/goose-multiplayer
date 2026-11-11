import { existsSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import type { Request, RequestHandler, Response } from 'express'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}
const ENCODINGS = [
  { name: 'br', suffix: '.br' },
  { name: 'gzip', suffix: '.gz' },
] as const

/* Sends `relative` (a path under `root`) as its .br or .gz sibling when the
   client accepts it and the build wrote one. False means nothing was sent and
   the caller falls through to the plain file. */
export function sendPrecompressed(
  root: string,
  relative: string,
  req: Request,
  res: Response,
): boolean {
  const type = TYPES[extname(relative)]
  if (type === undefined) return false
  const file = normalize(join(root, relative))
  if (!file.startsWith(root + sep)) return false
  const accepted = String(req.headers['accept-encoding'] ?? '')
  const encoding = ENCODINGS.find(
    (candidate) => accepted.includes(candidate.name) && existsSync(file + candidate.suffix),
  )
  if (encoding === undefined) return false
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Encoding', encoding.name)
  res.setHeader('Vary', 'Accept-Encoding')
  const hashed = relative.startsWith(`assets${sep}`) || relative.startsWith('assets/')
  res.sendFile(file + encoding.suffix, hashed ? { maxAge: '1y', immutable: true } : { maxAge: 0 })
  return true
}

/** Serves every text file of the build as its precompressed sibling, ahead of express.static. */
export function servePrecompressed(root: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    let relative: string
    try {
      relative = req.path === '/' ? 'index.html' : decodeURIComponent(req.path).replace(/^\/+/, '')
    } catch {
      return next()
    }
    if (relative.includes('\0') || !sendPrecompressed(root, relative, req, res)) next()
  }
}
