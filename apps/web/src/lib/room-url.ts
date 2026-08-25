/* A table code travels as a query parameter so a player can be invited with a
   link instead of six characters dictated over the phone. */
const PARAM = 'table'

/** The code carried by a location, or null. Never validates it: the server does. */
export function codeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get(PARAM)
  if (raw === null) return null
  const code = raw.trim().toUpperCase()
  return code.length > 0 ? code : null
}

export function urlForRoom(origin: string, pathname: string, code: string): string {
  return `${origin}${pathname}?${PARAM}=${encodeURIComponent(code)}`
}

/** Rewrites the address bar without reloading, so a refresh keeps the table. */
export function rememberRoom(code: string | null): void {
  if (typeof window === 'undefined' || !window.history) return
  const url = new URL(window.location.href)
  if (code === null) url.searchParams.delete(PARAM)
  else url.searchParams.set(PARAM, code)
  window.history.replaceState(null, '', url.toString())
}
