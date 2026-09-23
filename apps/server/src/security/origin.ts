/**
 * Whether a socket handshake may proceed, judged by its Origin header.
 *
 * A WebSocket upgrade is exempt from CORS, so the `cors` option alone never
 * stopped another site from opening a socket from a player's browser. No
 * Origin means a non-browser client, which this is not meant to stop.
 */
export function isAllowedOrigin(
  origin: string | undefined,
  host: string | undefined,
  corsOrigin: string | null,
): boolean {
  if (origin === undefined) return true
  if (corsOrigin && origin === corsOrigin) return true
  if (host === undefined) return false
  try {
    // Host carries the port when it is not the default, exactly like URL.host.
    return new URL(origin).host === host.toLowerCase()
  } catch {
    // "null" from a sandboxed frame or a file:// page: never same-origin.
    return false
  }
}
