import { createGame } from './init.js'
import type { GameState, Square, TableConfig } from './types.js'

/** A game whose seats already sit where the test needs them. */
export function gameAt(positions: Square[], config: Partial<TableConfig> = {}): GameState {
  /* The doubles house rule is off unless a test asks for it. Half the suite
     rolls [1, 1] because two is a convenient distance, not because it means
     to exercise the bonus roll; leaving it on would silently turn every one
     of those into a test of something else. reducer-double.test.ts turns it
     back on, and the invariants property drives it both ways. */
  const state = createGame(positions.length, { doubleAgain: false, ...config })
  return { ...state, positions: [...positions] }
}
