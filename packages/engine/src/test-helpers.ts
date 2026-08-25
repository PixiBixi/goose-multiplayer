import { createGame } from './init.js'
import type { GameState, Square, TableConfig } from './types.js'

/** A game whose seats already sit where the test needs them. */
export function gameAt(positions: Square[], config: Partial<TableConfig> = {}): GameState {
  const state = createGame(positions.length, config)
  return { ...state, positions: [...positions], hasRolled: positions.map(() => true) }
}
