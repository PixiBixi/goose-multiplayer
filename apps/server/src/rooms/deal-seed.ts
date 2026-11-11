import { randomBytes } from 'node:crypto'
import type { DeckState } from '@goose/engine'

/** Four 32-bit words from the OS entropy pool: the seed of the dice stream. */
export function randomDealSeed(): DeckState {
  const bytes = randomBytes(16)
  return [
    bytes.readUInt32LE(0),
    bytes.readUInt32LE(4),
    bytes.readUInt32LE(8),
    bytes.readUInt32LE(12),
  ]
}
