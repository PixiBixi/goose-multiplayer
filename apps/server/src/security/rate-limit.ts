import type { Clock } from '../rooms/room-manager.js'

/* A sliding window per key, backed by the injected clock so a test never
   waits out a real windowMs. Returns true when the call is allowed. */
export function makeRateLimiter(opts: {
  windowMs: number
  max: number
  clock: Clock
}): (key: string) => boolean {
  const hits = new Map<string, number[]>()

  return (key: string): boolean => {
    const now = opts.clock.now()
    const cutoff = now - opts.windowMs
    const recent = (hits.get(key) ?? []).filter((at) => at > cutoff)

    if (recent.length >= opts.max) {
      hits.set(key, recent)
      return false
    }

    recent.push(now)
    hits.set(key, recent)
    return true
  }
}
