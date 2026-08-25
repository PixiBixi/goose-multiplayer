import type { BlockReason, Square } from './types.js'

export const BOARD_SIZE = 63

export const GEESE: readonly Square[] = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]

export type SquareEffect =
  | { kind: 'goose' }
  | { kind: 'bridge'; to: Square }
  | { kind: 'dice'; to: Square }
  | { kind: 'maze'; to: Square }
  | { kind: 'death'; to: Square }
  | { kind: 'block'; reason: BlockReason }
  | { kind: 'inn'; turns: number }
  | { kind: 'garden' }

/* The board is a lookup table on purpose. Every rule that reads "if you land
   on X" reads it from here, so adding a square never means editing a cascade
   of conditionals in the reducer. */
const EFFECTS: ReadonlyMap<Square, SquareEffect> = new Map<Square, SquareEffect>([
  [6, { kind: 'bridge', to: 12 }],
  [19, { kind: 'inn', turns: 1 }],
  [26, { kind: 'dice', to: 53 }],
  [31, { kind: 'block', reason: 'well' }],
  [42, { kind: 'maze', to: 30 }],
  [52, { kind: 'block', reason: 'prison' }],
  [53, { kind: 'dice', to: 26 }],
  [58, { kind: 'death', to: 1 }],
  [63, { kind: 'garden' }],
  ...GEESE.map((g): [Square, SquareEffect] => [g, { kind: 'goose' }]),
])

export function effectAt(square: Square): SquareEffect | null {
  return EFFECTS.get(square) ?? null
}
