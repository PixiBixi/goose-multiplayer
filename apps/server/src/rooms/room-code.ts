import type { Rng } from '@goose/engine'

/* No O, 0, I, 1 or L: this code gets read out loud over a call, and the pairs
   that get misheard cost more than the six characters of entropy they add. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeRoomCode(rng: Rng): string {
  return Array.from(
    { length: 6 },
    // The index is always in range, but noUncheckedIndexedAccess still types
    // the lookup as possibly undefined.
    () => ALPHABET[Math.floor(rng() * ALPHABET.length)] ?? 'A',
  ).join('')
}
