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

export type DeckState = readonly [number, number, number, number]
export type DeckSeed = number | DeckState

/* sfc32: four 32-bit words of state. mulberry32 above holds 32, which a
   player who sees a few rolls could enumerate; this is the stream the server
   rolls the dice from. */
export function nextDeckRandom(state: DeckState): { value: number; state: DeckState } {
  let [a, b, c, d] = state
  let t = (a + b) | 0
  a = b ^ (b >>> 9)
  b = (c + (c << 3)) | 0
  c = (c << 21) | (c >>> 11)
  d = (d + 1) | 0
  t = (t + d) | 0
  c = (c + t) | 0
  return { value: (t >>> 0) / 4294967296, state: [a, b, c, d] }
}

/** Expands a numeric seed with splitmix32, then runs sfc32's recommended warm-up. */
export function deckState(seed: DeckSeed): DeckState {
  let state: DeckState
  if (typeof seed === 'number') {
    let s = seed | 0
    const words: number[] = []
    for (let i = 0; i < 4; i++) {
      s = (s + 0x9e3779b9) | 0
      let z = s
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)
      words.push((z ^ (z >>> 16)) | 0)
    }
    state = [words[0] ?? 0, words[1] ?? 0, words[2] ?? 0, words[3] ?? 0]
  } else {
    state = [seed[0] | 0, seed[1] | 0, seed[2] | 0, seed[3] | 0]
  }
  for (let i = 0; i < 12; i++) state = nextDeckRandom(state).state
  return state
}

/** An Rng over the 128-bit stream, for the dice. */
export function makeDeckRng(seed: DeckSeed): Rng {
  let state = deckState(seed)
  return () => {
    const next = nextDeckRandom(state)
    state = next.state
    return next.value
  }
}

export function rollDice(rng: Rng, count: 1 | 2): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(rng() * 6))
}
