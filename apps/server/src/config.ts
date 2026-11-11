export type ServerConfig = {
  port: number
  behindTls: boolean
  corsOrigin: string | null
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /* Keyed by client IP (see security/client-ip.ts): a script that reconnects
     gets no fresh allowance. */
  createBurst: number
  createPerSecond: number
  /** Rooms one client IP may hold at once, so one address cannot reach MAX_ROOMS alone. */
  maxRoomsPerIp: number
  /** Joins per client IP: room for a family behind one NAT, slow for a code guesser. */
  joinBurst: number
  joinPerSecond: number
}

function positive(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  integer: boolean,
): number {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be a positive ${integer ? 'integer' : 'number'}`)
  }
  return value
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
    createBurst: positive(env, 'CREATE_BURST', 3, true),
    createPerSecond: positive(env, 'CREATE_PER_SECOND', 0.1, false),
    maxRoomsPerIp: positive(env, 'MAX_ROOMS_PER_IP', 10, true),
    joinBurst: positive(env, 'JOIN_BURST', 10, true),
    joinPerSecond: positive(env, 'JOIN_PER_SECOND', 0.5, false),
  }
}
