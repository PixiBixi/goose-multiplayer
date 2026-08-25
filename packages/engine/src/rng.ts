export type Rng = () => number

/* mulberry32. Seeded so a whole game replays from one number, which is what
   makes a reported bug reproducible instead of a story about bad luck. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rollDice(rng: Rng, count: 1 | 2): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(rng() * 6))
}
