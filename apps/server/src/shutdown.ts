export type ShutdownDeps = {
  close: () => Promise<void>
  exit: (code: number) => void
  logError: (message: string, meta: Record<string, unknown>) => void
  setTimer: (fn: () => void, ms: number) => { unref(): void }
}

/* Exits explicitly rather than waiting for the loop to drain: closing fires
   every socket's disconnect, which arms 90 s grace timers that would hold the
   process open. A second signal is ignored, and a hung close is cut at 10 s. */
export function createShutdown(deps: ShutdownDeps): (signal: string) => Promise<void> {
  let shuttingDown = false
  return async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    deps.setTimer(() => deps.exit(1), 10_000).unref()
    try {
      await deps.close()
      deps.exit(0)
    } catch (err) {
      deps.logError('shutdown failed', {
        signal,
        error: err instanceof Error ? err.message : String(err),
      })
      deps.exit(1)
    }
  }
}
