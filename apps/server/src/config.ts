export type ServerConfig = {
  port: number
  behindTls: boolean
  corsOrigin: string | null
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export function loadConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const port = env.PORT === undefined ? 5050 : Number(env.PORT)
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT must be a positive integer')
  return {
    port,
    /* Defaults to false so a plain `docker run` works. Traefik sets it, and
       the e2e suite proves the upgrade goes through with it on. */
    behindTls: env.BEHIND_TLS === 'true',
    corsOrigin: env.CORS_ORIGIN ?? null,
    logLevel: (env.LOG_LEVEL as ServerConfig['logLevel']) ?? 'info',
  }
}
