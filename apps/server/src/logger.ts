import type { ServerConfig } from './config.js'

type Level = ServerConfig['logLevel']

const ORDER: Level[] = ['debug', 'info', 'warn', 'error']

export type Logger = {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

/* One JSON line per call, filtered by the configured threshold. Structured so
   it can be shipped as-is to a log aggregator without a parsing step. */
export function createLogger(level: Level): Logger {
  const threshold = ORDER.indexOf(level)
  const log = (at: Level, message: string, meta?: Record<string, unknown>): void => {
    if (ORDER.indexOf(at) < threshold) return
    const line = { time: new Date().toISOString(), level: at, message, ...meta }
    console[at](JSON.stringify(line))
  }
  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  }
}
