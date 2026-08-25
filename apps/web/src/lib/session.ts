/* One token per browser profile, minted once and kept. It is the only thing
   that tells the server "this is the same player, back again" after a drop,
   so it must survive a reload: without it the seat waits out the full 90
   second grace and is then lost. */
const KEY = 'goose.session'
const MAX_LENGTH = 64

/** Set when storage is unusable, so the token stays stable within the tab. */
let inMemory: string | null = null

function mint(): string {
  /* randomUUID needs a secure context; plain http on a LAN is not one, and
     that is exactly how two people test this on the same wifi. */
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function read(): string | null {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored !== null && stored.length > 0 && stored.length <= MAX_LENGTH ? stored : null
  } catch {
    /* Safari in private browsing throws on access, not on write. A player
       who cannot persist still gets a token, just not one that survives a
       reload. */
    return null
  }
}

function write(token: string): void {
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    inMemory = token
  }
}

export function sessionToken(): string {
  const stored = read()
  if (stored !== null) return stored
  if (inMemory !== null) return inMemory
  const token = mint()
  inMemory = token
  write(token)
  return token
}

/** Only for the tests: drops the token so the next call mints a fresh one. */
export function forgetSession(): void {
  inMemory = null
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* Nothing to remove when storage never worked. */
  }
}
