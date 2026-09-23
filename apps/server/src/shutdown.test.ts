import { describe, expect, it, vi } from 'vitest'
import { createShutdown } from './shutdown.js'

const deps = (close: () => Promise<void>) => ({
  close,
  exit: vi.fn(),
  logError: vi.fn(),
  setTimer: vi.fn((fn: () => void) => ({ fn, unref: vi.fn() })),
})

describe('shutdown', () => {
  it('closes the server then exits cleanly', async () => {
    const d = deps(() => Promise.resolve())
    await createShutdown(d)('SIGTERM')
    expect(d.exit).toHaveBeenCalledWith(0)
  })

  it('closes only once when a second signal arrives', async () => {
    const close = vi.fn(() => Promise.resolve())
    const d = deps(close)
    const shutdown = createShutdown(d)
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')])
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('exits with an error when closing fails', async () => {
    const d = deps(() => Promise.reject(new Error('stuck')))
    await createShutdown(d)('SIGTERM')
    expect(d.logError).toHaveBeenCalled()
    expect(d.exit).toHaveBeenCalledWith(1)
  })

  it('arms a hard exit that does not keep the process alive', async () => {
    const d = deps(() => new Promise<void>(() => undefined))
    void createShutdown(d)('SIGTERM')
    const timer = d.setTimer.mock.results[0]?.value as { fn: () => void; unref: () => void }
    expect(timer.unref).toHaveBeenCalled()
    timer.fn()
    expect(d.exit).toHaveBeenCalledWith(1)
  })
})
