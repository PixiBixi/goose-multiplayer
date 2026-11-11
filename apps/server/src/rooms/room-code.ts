import { randomInt } from 'node:crypto'

/* No O, 0, I, 1 or L: this code gets read out loud over a call, and the pairs
   that get misheard cost more than the six characters of entropy they add. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/* From crypto: the code is the only access control, so a seeded PRNG would let
   one observed code predict every other. Do NOT swap it for makeRng. */
export function makeRoomCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join('')
}
