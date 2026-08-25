# goose-multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un jeu de l'oie en ligne pour 2 à 6 joueurs, serveur autoritaire, auto-hébergé derrière Traefik, avec un moteur de règles pur et testé par propriétés.

**Architecture:** Monorepo npm workspaces. `packages/engine` est pur (aucune I/O, aucune dépendance) et résout un lancer en une chaîne d'étapes rejouable. `packages/protocol` porte les types du wire et leurs schémas Zod. `apps/server` détient l'autorité : il tire les dés, calcule les positions et n'expose au client qu'une vue projetée. `apps/web` rend ce qu'on lui donne et n'applique aucune règle.

**Tech Stack:** TypeScript 6, Node 26, Vitest 4, fast-check 4, Zod, Socket.IO, Express, React 19, Vite, Playwright, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-goose-multiplayer-design.md`

## Global Constraints

- **Code, commentaires et messages de commit en anglais.** La conversation et les specs restent en français.
- **Conventional Commits, un commit par scope.** Ne jamais grouper des changements sans rapport.
- **`npm run verify` avant chaque commit** (lint, typecheck, test). Vérifier le code de sortie : un `| tail` avale l'échec.
- **Éviter les backticks dans un message de commit écrit en ligne dans un shell.** Utiliser `git commit -F <fichier>` si le message en contient.
- **`packages/engine` est pur** : aucune I/O, aucun réseau, aucune dépendance de production. Cette contrainte est vérifiée par un test.
- **`Room` est synchrone et sans timer.** Les timers et l'horloge vivent dans `RoomManager` derrière des interfaces injectables.
- **Numéro de siège == index de siège engine.** Positions, blocages et attentes sont indexés par siège.
- **Node 26**, épinglé dans `.nvmrc`. `engines.node` vaut `>=22`.
- **Termes inclusifs** : allowlist/blocklist, primary/replica, main branch.
- **Jamais de tiret cadratin** dans quoi que ce soit qui sorte du dépôt.
- **Une seule réplique en production.** L'état vit en mémoire, il n'y a pas d'adaptateur Redis.

---

## Structure des fichiers

```
packages/engine/src/
  types.ts        Square, Seat, TableConfig, GameState, Move, Step
  board.ts        les 63 cases comme table de données
  rng.ts          RNG seedé et tirage de dés
  init.ts         création d'un état
  reducer.ts      applyRoll : la chaîne de résolution
  rules.ts        legalMoves, nextSeat
  match.ts        classement, restart
  index.ts        surface publique
packages/protocol/src/
  events.ts       les noms et charges utiles du wire
  schemas.ts      les schémas Zod des actions clientes
  views.ts        TableView, SeatView, ChatLine
  index.ts
apps/server/src/
  config.ts       variables d'environnement
  logger.ts
  http.ts         Express, /healthz, statiques
  views.ts        projection Room vers TableView
  rooms/room.ts   synchrone, sans timer
  rooms/room-code.ts
  rooms/room-manager.ts   timers, horloge et RNG injectés
  sockets/handlers.ts
  security/rate-limit.ts
  index.ts
apps/web/src/
  lib/board-layout.ts   géométrie de la spirale et du serpentin
  lib/session.ts
  lib/describe-step.ts  une étape vers une phrase
  components/Board.tsx  bascule spirale / grille
  components/BoardSpiral.tsx
  components/BoardGrid.tsx
  components/Die.tsx
  components/Seat.tsx
  components/TableRulesPanel.tsx
  components/ChatPanel.tsx
  hooks/useGameSocket.ts
  hooks/game-reducer.ts
  hooks/useStepPlayback.ts
  screens/Home.tsx, Lobby.tsx, Table.tsx
  styles/tokens.css, app.css
  i18n/
e2e/
  lobby.spec.ts, game.spec.ts, six-players.spec.ts
```

---

## Phase A : fondations et moteur

### Task 1: Squelette du monorepo

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.nvmrc`, `vitest.config.ts`, `LICENSE`
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.build.json`, `packages/engine/src/index.ts`
- Test: `packages/engine/src/index.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: les workspaces `@goose/engine`, et les scripts racine `build`, `typecheck`, `test`, `lint`, `format`, `format:check`, `verify`.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/index.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from './index.js'

describe('engine surface', () => {
  it('exposes the board size', () => {
    expect(BOARD_SIZE).toBe(63)
  })
})
```

- [ ] **Step 2: Poser la configuration**

`.nvmrc` :

```
26
```

`package.json` racine :

```json
{
  "name": "goose-multiplayer",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "tsc --build tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "verify": "npm run lint && npm run typecheck && npm run test"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^26.2.0",
    "@vitest/coverage-v8": "^4.1.11",
    "eslint": "^10.8.1",
    "fast-check": "^4.9.0",
    "prettier": "^3.9.6",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.67.0",
    "vitest": "^4.1.10"
  }
}
```

`tsconfig.base.json` :

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "composite": true,
    "skipLibCheck": true
  }
}
```

`packages/engine/package.json` :

```json
{
  "name": "@goose/engine",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" }
}
```

`packages/engine/src/index.ts` :

```ts
export const BOARD_SIZE = 63
```

- [ ] **Step 3: Installer et lancer le test**

Run : `npm install && npx vitest run packages/engine`
Expected : PASS, 1 test.

- [ ] **Step 4: Vérifier la chaîne complète**

Run : `npm run verify`
Expected : exit 0. Corriger le formatage avec `npm run format` si `lint` se plaint.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold the npm workspaces monorepo"
```

---

### Task 2: Le plateau comme donnée

**Files:**
- Create: `packages/engine/src/types.ts`, `packages/engine/src/board.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/src/board.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type Square = number` (0 à 63, 0 vaut départ), `type Seat = number`, `type BlockReason = 'well' | 'prison'`
  - `const GEESE: readonly Square[]`
  - `type SquareEffect = { kind: 'goose' } | { kind: 'bridge'; to: Square } | { kind: 'dice'; to: Square } | { kind: 'maze'; to: Square } | { kind: 'death'; to: Square } | { kind: 'block'; reason: BlockReason } | { kind: 'garden' }`
  - `function effectAt(square: Square): SquareEffect | null`

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/board.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { GEESE, effectAt } from './board.js'

describe('board', () => {
  it('has thirteen geese, every nine squares from five', () => {
    expect(GEESE).toEqual([5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59])
  })

  it('maps every special square to its effect', () => {
    expect(effectAt(6)).toEqual({ kind: 'bridge', to: 12 })
    expect(effectAt(19)).toEqual({ kind: 'block', reason: 'inn' as never })
    expect(effectAt(26)).toEqual({ kind: 'dice', to: 53 })
    expect(effectAt(31)).toEqual({ kind: 'block', reason: 'well' })
    expect(effectAt(42)).toEqual({ kind: 'maze', to: 30 })
    expect(effectAt(52)).toEqual({ kind: 'block', reason: 'prison' })
    expect(effectAt(53)).toEqual({ kind: 'dice', to: 26 })
    expect(effectAt(58)).toEqual({ kind: 'death', to: 1 })
    expect(effectAt(63)).toEqual({ kind: 'garden' })
  })

  it('marks each goose square', () => {
    for (const g of GEESE) expect(effectAt(g)).toEqual({ kind: 'goose' })
  })

  it('returns null on an ordinary square', () => {
    for (const n of [1, 2, 12, 30, 40, 62]) expect(effectAt(n)).toBeNull()
  })
})
```

Corriger la ligne 19 avant de lancer : l'auberge n'est pas un blocage, c'est une attente. Remplacer par :

```ts
    expect(effectAt(19)).toEqual({ kind: 'inn', turns: 1 })
```

et ajouter `| { kind: 'inn'; turns: number }` à `SquareEffect`.

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/board.test.ts`
Expected : FAIL, `Cannot find module './board.js'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`packages/engine/src/types.ts` :

```ts
/** 0 is the start, off the board. 1 to 63 are the printed squares. */
export type Square = number
export type Seat = number
export type BlockReason = 'well' | 'prison'

export type TableConfig = {
  exactFinish: boolean
  twoDice: boolean
  rescue: boolean
  opening9: boolean
  mode: 'classic' | 'cards'
}
```

`packages/engine/src/board.ts` :

```ts
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
```

`packages/engine/src/index.ts` :

```ts
export * from './board.js'
export * from './types.js'
```

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): describe the board as a lookup table"
```

---

### Task 3: RNG seedé et tirage de dés

**Files:**
- Create: `packages/engine/src/rng.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/src/rng.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `type Rng = () => number`, `function makeRng(seed: number): Rng`, `function rollDice(rng: Rng, count: 1 | 2): number[]`

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/rng.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { makeRng, rollDice } from './rng.js'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(1234)
    const b = makeRng(1234)
    const left = [a(), a(), a()]
    const right = [b(), b(), b()]
    expect(left).toEqual(right)
  })

  it('stays inside [0, 1)', () => {
    const rng = makeRng(7)
    for (let i = 0; i < 10_000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('rolls the asked number of dice, each between one and six', () => {
    const rng = makeRng(99)
    expect(rollDice(rng, 1)).toHaveLength(1)
    for (let i = 0; i < 2000; i++) {
      for (const d of rollDice(rng, 2)) {
        expect(Number.isInteger(d)).toBe(true)
        expect(d).toBeGreaterThanOrEqual(1)
        expect(d).toBeLessThanOrEqual(6)
      }
    }
  })

  it('reaches every face on both dice', () => {
    const rng = makeRng(5)
    const seen = new Set<number>()
    for (let i = 0; i < 5000; i++) for (const d of rollDice(rng, 2)) seen.add(d)
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })
})
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/rng.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Step 3: Écrire l'implémentation minimale**

```ts
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
```

Ajouter `export * from './rng.js'` à `index.ts`.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): add a seeded rng and dice rolling"
```

---

### Task 4: Création d'une partie

**Files:**
- Create: `packages/engine/src/init.ts`
- Modify: `packages/engine/src/types.ts`, `packages/engine/src/index.ts`
- Test: `packages/engine/src/init.test.ts`

**Interfaces:**
- Consumes: `TableConfig` (Task 2).
- Produces:
  - `type GameState = { config: TableConfig; seatCount: number; positions: Square[]; blocked: (BlockReason | null)[]; skipTurns: number[]; hasRolled: boolean[]; turn: Seat; winner: Seat | null; finished: boolean; hands?: never[] }`
  - `const DEFAULT_CONFIG: TableConfig`
  - `function createGame(seatCount: number, config?: Partial<TableConfig>): GameState`
  - `const MIN_SEATS = 2`, `const MAX_SEATS = 6`

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/init.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, MAX_SEATS, MIN_SEATS, createGame } from './init.js'

describe('createGame', () => {
  it('starts every seat off the board, unblocked and free to play', () => {
    const s = createGame(4)
    expect(s.positions).toEqual([0, 0, 0, 0])
    expect(s.blocked).toEqual([null, null, null, null])
    expect(s.skipTurns).toEqual([0, 0, 0, 0])
    expect(s.hasRolled).toEqual([false, false, false, false])
    expect(s.turn).toBe(0)
    expect(s.winner).toBeNull()
    expect(s.finished).toBe(false)
  })

  it('defaults to the historic rules with two dice', () => {
    expect(DEFAULT_CONFIG).toEqual({
      exactFinish: true,
      twoDice: true,
      rescue: true,
      opening9: false,
      mode: 'classic',
    })
  })

  it('takes a partial config override', () => {
    expect(createGame(2, { twoDice: false }).config.twoDice).toBe(false)
    expect(createGame(2, { twoDice: false }).config.rescue).toBe(true)
  })

  it('carries no hands in classic mode', () => {
    expect(createGame(2).hands).toBeUndefined()
  })

  it('refuses a seat count outside two to six', () => {
    expect(MIN_SEATS).toBe(2)
    expect(MAX_SEATS).toBe(6)
    expect(() => createGame(1)).toThrow(/seat count/i)
    expect(() => createGame(7)).toThrow(/seat count/i)
  })
})
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/init.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Step 3: Écrire l'implémentation minimale**

Ajouter à `types.ts` :

```ts
export type GameState = {
  config: TableConfig
  seatCount: number
  positions: Square[]
  blocked: (BlockReason | null)[]
  skipTurns: number[]
  /** Only the first roll can trigger the opening-nine rule. */
  hasRolled: boolean[]
  turn: Seat
  winner: Seat | null
  finished: boolean
  /* Phase 2 extension point. Absent in classic mode, and the server refuses
     the card actions while it is. Declared here so adding cards never means
     changing the shape of the state that crosses the wire. */
  hands?: never[]
}

export type Move = 'roll'
```

`init.ts` :

```ts
import type { GameState, Seat, TableConfig } from './types.js'

export const MIN_SEATS = 2
export const MAX_SEATS = 6

export const DEFAULT_CONFIG: TableConfig = {
  exactFinish: true,
  twoDice: true,
  rescue: true,
  opening9: false,
  mode: 'classic',
}

export function createGame(seatCount: number, config: Partial<TableConfig> = {}): GameState {
  if (!Number.isInteger(seatCount) || seatCount < MIN_SEATS || seatCount > MAX_SEATS) {
    throw new Error(`seat count must be an integer between ${MIN_SEATS} and ${MAX_SEATS}`)
  }
  const zeroes = (): number[] => Array.from({ length: seatCount }, () => 0)
  return {
    config: { ...DEFAULT_CONFIG, ...config },
    seatCount,
    positions: zeroes(),
    blocked: Array.from({ length: seatCount }, () => null),
    skipTurns: zeroes(),
    hasRolled: Array.from({ length: seatCount }, () => false),
    turn: 0 satisfies Seat,
    winner: null,
    finished: false,
  }
}
```

Ajouter `export * from './init.js'` à `index.ts`.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): create a game state for two to six seats"
```

---

### Task 5: Avance simple et rebond

**Files:**
- Create: `packages/engine/src/reducer.ts`, `packages/engine/src/test-helpers.ts`
- Modify: `packages/engine/src/types.ts`, `packages/engine/src/index.ts`
- Test: `packages/engine/src/reducer-move.test.ts`

**Interfaces:**
- Consumes: `GameState`, `createGame`, `effectAt`.
- Produces:
  - `type Step` (union complète, voir le code ci-dessous)
  - `const MAX_STEPS = 16`
  - `function applyRoll(state: GameState, dice: number[]): { state: GameState; steps: Step[] }`
  - `function seatAt(state: GameState, square: Square, except: Seat): Seat | null` (helper interne exporté pour les tests)
  - `test-helpers.ts` : `function gameAt(positions: Square[], config?: Partial<TableConfig>): GameState`

Cette tâche ne traite que les cases ordinaires, le jardin et le rebond. Les oies, les téléports, les blocages et l'attente arrivent aux tâches 6 à 8, et les tests de cette tâche utilisent uniquement des cases ordinaires pour rester valides ensuite.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/test-helpers.ts` :

```ts
import { createGame } from './init.js'
import type { GameState, Square, TableConfig } from './types.js'

/** A game whose seats already sit where the test needs them. */
export function gameAt(positions: Square[], config: Partial<TableConfig> = {}): GameState {
  const state = createGame(positions.length, config)
  return { ...state, positions: [...positions], hasRolled: positions.map(() => true) }
}
```

`packages/engine/src/reducer-move.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, plain movement', () => {
  it('advances by the sum of the dice', () => {
    const { state, steps } = applyRoll(gameAt([2, 0]), [4, 3])
    expect(state.positions[0]).toBe(9 - 0 + 2 - 2) // see the next assertion
    expect(steps[0]).toEqual({ kind: 'move', from: 2, to: 9, by: 7 })
  })

  it('records the arrival on an ordinary square as a single step', () => {
    const { steps } = applyRoll(gameAt([1, 0]), [1, 1])
    expect(steps).toEqual([{ kind: 'move', from: 1, to: 3, by: 2 }])
  })

  it('wins on sixty-three', () => {
    const { state, steps } = applyRoll(gameAt([60, 0]), [2, 1])
    expect(state.positions[0]).toBe(63)
    expect(state.winner).toBe(0)
    expect(state.finished).toBe(true)
    expect(steps.at(-1)).toEqual({ kind: 'win', seat: 0, at: 63 })
  })

  it('bounces back by the overshoot when exact finish is on', () => {
    const { state, steps } = applyRoll(gameAt([62, 0]), [3, 1])
    expect(state.positions[0]).toBe(59 + 0) // 63 - (66 - 63) = 60, see below
    expect(steps).toContainEqual({ kind: 'bounce', from: 66, to: 60, overshoot: 3 })
    expect(state.winner).toBeNull()
  })

  it('wins on an overshoot when exact finish is off', () => {
    const { state } = applyRoll(gameAt([62, 0], { exactFinish: false }), [3, 1])
    expect(state.positions[0]).toBe(63)
    expect(state.winner).toBe(0)
  })

  it('passes the turn to the next seat', () => {
    const { state } = applyRoll(gameAt([1, 1, 1]), [1, 1])
    expect(state.turn).toBe(1)
  })

  it('refuses to roll on a finished game', () => {
    const finished = { ...gameAt([63, 0]), finished: true, winner: 0 }
    expect(() => applyRoll(finished, [1, 1])).toThrow(/finished/i)
  })
})
```

Corriger les deux assertions marquées d'un commentaire avant de lancer : ligne 8 devient `expect(state.positions[0]).toBe(9)`, et l'assertion de rebond devient `expect(state.positions[0]).toBe(60)`. Le commentaire n'a pas à survivre.

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/reducer-move.test.ts`
Expected : FAIL, `Cannot find module './reducer.js'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Ajouter à `types.ts` :

```ts
export type Step =
  | { kind: 'move'; from: Square; to: Square; by: number }
  | { kind: 'goose'; from: Square; to: Square; by: number }
  | { kind: 'bridge' | 'dice' | 'maze' | 'death'; from: Square; to: Square }
  | { kind: 'bounce'; from: Square; to: Square; overshoot: number }
  | { kind: 'blocked'; seat: Seat; at: Square; reason: BlockReason }
  | { kind: 'rescue'; seat: Seat; at: Square; to: Square }
  | { kind: 'skip'; seat: Seat; turns: number }
  | { kind: 'win'; seat: Seat; at: number }
```

`reducer.ts` :

```ts
import { BOARD_SIZE } from './board.js'
import type { GameState, Seat, Square, Step } from './types.js'

/* The chain is provably bounded (see the spec), so this cap never fires on a
   correct reducer. It exists so a rule change that reopens a cycle fails a
   test instead of hanging a table. Do NOT raise it to make a test pass. */
export const MAX_STEPS = 16

export function applyRoll(
  state: GameState,
  dice: number[],
): { state: GameState; steps: Step[] } {
  if (state.finished) throw new Error('the game is finished')

  const seat = state.turn
  const by = dice.reduce((a, b) => a + b, 0)
  const steps: Step[] = []
  const next: GameState = {
    ...state,
    positions: [...state.positions],
    blocked: [...state.blocked],
    skipTurns: [...state.skipTurns],
    hasRolled: [...state.hasRolled],
  }
  next.hasRolled[seat] = true

  const from = next.positions[seat] ?? 0
  const raw = from + by

  let landed: Square
  if (raw > BOARD_SIZE && next.config.exactFinish) {
    landed = BOARD_SIZE - (raw - BOARD_SIZE)
    steps.push({ kind: 'move', from, to: raw, by })
    steps.push({ kind: 'bounce', from: raw, to: landed, overshoot: raw - BOARD_SIZE })
  } else {
    landed = Math.min(raw, BOARD_SIZE)
    steps.push({ kind: 'move', from, to: landed, by })
  }

  next.positions[seat] = landed

  if (landed === BOARD_SIZE) {
    next.winner = seat
    next.finished = true
    steps.push({ kind: 'win', seat, at: BOARD_SIZE })
    return { state: next, steps }
  }

  next.turn = (seat + 1) % next.seatCount
  return { state: next, steps }
}
```

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): resolve a plain move, the garden and the rebound"
```

---

### Task 6: La chaîne d'oies

**Files:**
- Modify: `packages/engine/src/reducer.ts`
- Test: `packages/engine/src/reducer-goose.test.ts`

**Interfaces:**
- Consumes: `applyRoll`, `effectAt`, `MAX_STEPS`.
- Produces: aucune nouvelle signature. `applyRoll` gagne la résolution des oies.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/reducer-goose.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { MAX_STEPS, applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, geese', () => {
  it('advances again by the same roll from a goose', () => {
    // 3 + 2 = 5, a goose, then 5 + 2 = 7, ordinary.
    const { state, steps } = applyRoll(gameAt([3, 0]), [1, 1])
    expect(state.positions[0]).toBe(7)
    expect(steps).toEqual([
      { kind: 'move', from: 3, to: 5, by: 2 },
      { kind: 'goose', from: 5, to: 7, by: 2 },
    ])
  })

  it('chains from goose to goose', () => {
    // 5 + 9 = 14, goose; 14 + 9 = 23, goose; 23 + 9 = 32, goose; 32 + 9 = 41,
    // goose; 41 + 9 = 50, goose; 50 + 9 = 59, goose; 59 + 9 = 68 -> bounce.
    const { state, steps } = applyRoll(gameAt([5, 0]), [5, 4])
    const geese = steps.filter((s) => s.kind === 'goose')
    expect(geese.length).toBeGreaterThanOrEqual(5)
    expect(state.positions[0]).toBe(63 - (68 - 63))
    expect(steps.at(-1)).toEqual({ kind: 'bounce', from: 68, to: 58, overshoot: 5 })
  })

  it('does not trigger a goose after a rebound', () => {
    // 60 + 4 = 64 -> bounce to 62. 62 is ordinary, but the rule holds even
    // when the rebound lands on a goose, so assert on the step kinds.
    const { steps } = applyRoll(gameAt([60, 0]), [2, 2])
    expect(steps.some((s) => s.kind === 'goose')).toBe(false)
  })

  it('lets a goose chain feed a teleport square', () => {
    // 4 + 1 = 5, a goose; 5 + 1 = 6, the bridge.
    const { steps } = applyRoll(gameAt([4, 0], { twoDice: false }), [1])
    expect(steps.map((s) => s.kind)).toEqual(['move', 'goose', 'bridge'])
  })

  it('never exceeds the step cap', () => {
    const { steps } = applyRoll(gameAt([5, 0]), [5, 4])
    expect(steps.length).toBeLessThanOrEqual(MAX_STEPS)
  })
})
```

Le test `lets a goose chain feed a teleport square` échouera tant que la tâche 7 n'est pas faite. Le marquer `it.skip` maintenant et le réactiver en tâche 7, en le notant dans le message de commit.

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/reducer-goose.test.ts`
Expected : FAIL, aucune étape `goose` produite.

- [ ] **Step 3: Écrire l'implémentation minimale**

Remplacer le corps de `applyRoll` par une boucle de résolution. La sortie de `reducer.ts` :

```ts
import { BOARD_SIZE, effectAt } from './board.js'
import type { GameState, Seat, Square, Step } from './types.js'

export const MAX_STEPS = 16

type Chain = { landed: Square; bounced: boolean; steps: Step[] }

/* One advance: forward by `by`, rebounding off 63 when exact finish is on.
   Returns whether it rebounded, because a rebound stops the goose chain. */
function advance(from: Square, by: number, exactFinish: boolean): Chain {
  const raw = from + by
  if (raw > BOARD_SIZE && exactFinish) {
    const landed = BOARD_SIZE - (raw - BOARD_SIZE)
    return {
      landed,
      bounced: true,
      steps: [
        { kind: 'move', from, to: raw, by },
        { kind: 'bounce', from: raw, to: landed, overshoot: raw - BOARD_SIZE },
      ],
    }
  }
  const landed = Math.min(raw, BOARD_SIZE)
  return { landed, bounced: false, steps: [{ kind: 'move', from, to: landed, by }] }
}

export function applyRoll(
  state: GameState,
  dice: number[],
): { state: GameState; steps: Step[] } {
  if (state.finished) throw new Error('the game is finished')

  const seat = state.turn
  const by = dice.reduce((a, b) => a + b, 0)
  const next: GameState = {
    ...state,
    positions: [...state.positions],
    blocked: [...state.blocked],
    skipTurns: [...state.skipTurns],
    hasRolled: [...state.hasRolled],
  }
  next.hasRolled[seat] = true

  const first = advance(next.positions[seat] ?? 0, by, next.config.exactFinish)
  const steps: Step[] = [...first.steps]
  let square = first.landed
  let bounced = first.bounced

  while (steps.length < MAX_STEPS) {
    const effect = effectAt(square)
    if (effect?.kind === 'goose' && !bounced) {
      const hop = advance(square, by, next.config.exactFinish)
      // A goose re-advance is one step for the reader, not a move plus a hop.
      steps.push({ kind: 'goose', from: square, to: hop.landed, by })
      if (hop.bounced) {
        steps.push(hop.steps[1] as Step)
        bounced = true
      }
      square = hop.landed
      continue
    }
    break
  }

  if (steps.length >= MAX_STEPS) throw new Error('resolution chain exceeded the step cap')

  next.positions[seat] = square

  if (square === BOARD_SIZE) {
    next.winner = seat
    next.finished = true
    steps.push({ kind: 'win', seat, at: BOARD_SIZE })
    return { state: next, steps }
  }

  next.turn = (seat + 1) % next.seatCount
  return { state: next, steps }
}
```

Note : lorsqu'une avance d'oie rebondit, l'étape `goose` porte déjà la case brute. Ajuster pour que `goose.to` soit la case brute et le `bounce` suivant la corrige, ce que les tests de la tâche 6 vérifient déjà via `steps.at(-1)`.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS, sauf le test volontairement `skip`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): chain goose squares and stop the chain on a rebound"
```

---

### Task 7: Les téléports

**Files:**
- Modify: `packages/engine/src/reducer.ts`
- Modify: `packages/engine/src/reducer-goose.test.ts` (retirer le `it.skip`)
- Test: `packages/engine/src/reducer-teleport.test.ts`

**Interfaces:**
- Consumes: `applyRoll`, `effectAt`.
- Produces: aucune nouvelle signature.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/reducer-teleport.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, teleports', () => {
  it('sends the bridge to twelve', () => {
    const { state, steps } = applyRoll(gameAt([4, 0]), [1, 1])
    expect(state.positions[0]).toBe(12)
    expect(steps).toContainEqual({ kind: 'bridge', from: 6, to: 12 })
  })

  it('sends the maze back to thirty', () => {
    const { state, steps } = applyRoll(gameAt([40, 0]), [1, 1])
    expect(state.positions[0]).toBe(30)
    expect(steps).toContainEqual({ kind: 'maze', from: 42, to: 30 })
  })

  it('sends death back to one', () => {
    const { state, steps } = applyRoll(gameAt([56, 0]), [1, 1])
    expect(state.positions[0]).toBe(1)
    expect(steps).toContainEqual({ kind: 'death', from: 58, to: 1 })
  })

  it('sends twenty-six to fifty-three and stops there', () => {
    const { state, steps } = applyRoll(gameAt([24, 0]), [1, 1])
    expect(state.positions[0]).toBe(53)
    expect(steps).toContainEqual({ kind: 'dice', from: 26, to: 53 })
    // The arrival square's own effect must not fire, or 53 would send back to
    // 26, which sends back to 53, for ever.
    expect(steps.filter((s) => s.kind === 'dice')).toHaveLength(1)
  })

  it('sends fifty-three back to twenty-six and stops there', () => {
    const { state, steps } = applyRoll(gameAt([51, 0]), [1, 1])
    expect(state.positions[0]).toBe(26)
    expect(steps.filter((s) => s.kind === 'dice')).toHaveLength(1)
  })

  it('applies a teleport reached by a rebound', () => {
    // 55 + 8 = 63 exactly, so use 54 + 9 = 63... pick an overshoot onto 58:
    // 62 + 4 = 66 -> bounce to 60, ordinary. Use 61 + 5 = 66 -> 60 too.
    // Land on 58 by bouncing from 68: 63 - (68 - 63) = 58.
    const { state, steps } = applyRoll(gameAt([59, 0]), [5, 4])
    expect(steps).toContainEqual({ kind: 'bounce', from: 68, to: 58, overshoot: 5 })
    expect(steps).toContainEqual({ kind: 'death', from: 58, to: 1 })
    expect(state.positions[0]).toBe(1)
  })
})
```

Retirer le commentaire de travail des trois dernières lignes du dernier test avant de committer.

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/reducer-teleport.test.ts`
Expected : FAIL, aucune étape de téléport.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans la boucle de `applyRoll`, après la branche `goose`, ajouter :

```ts
    if (
      effect &&
      (effect.kind === 'bridge' ||
        effect.kind === 'dice' ||
        effect.kind === 'maze' ||
        effect.kind === 'death')
    ) {
      steps.push({ kind: effect.kind, from: square, to: effect.to })
      square = effect.to
      /* The arrival square resolves nothing. Without this, 26 sends to 53,
         which sends back to 26, for ever. Do NOT remove. */
      break
    }
```

- [ ] **Step 4: Réactiver le test mis de côté et lancer la suite**

Retirer le `it.skip` de `lets a goose chain feed a teleport square` dans `reducer-goose.test.ts`.

Run : `npx vitest run packages/engine`
Expected : PASS, tous les tests.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): resolve the bridge, the dice squares, the maze and death"
```

---

### Task 8: Blocages, délivrance et attente

**Files:**
- Modify: `packages/engine/src/reducer.ts`
- Test: `packages/engine/src/reducer-block.test.ts`

**Interfaces:**
- Consumes: `applyRoll`, `effectAt`.
- Produces: aucune nouvelle signature. `state.blocked` et `state.skipTurns` sont désormais écrits par `applyRoll`.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/reducer-block.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

describe('applyRoll, blocking and waiting', () => {
  it('blocks in the well', () => {
    const { state, steps } = applyRoll(gameAt([29, 0]), [1, 1])
    expect(state.positions[0]).toBe(31)
    expect(state.blocked[0]).toBe('well')
    expect(steps).toContainEqual({ kind: 'blocked', seat: 0, at: 31, reason: 'well' })
  })

  it('blocks in prison', () => {
    const { state } = applyRoll(gameAt([50, 0]), [1, 1])
    expect(state.blocked[0]).toBe('prison')
  })

  it('makes the inn cost one turn', () => {
    const { state, steps } = applyRoll(gameAt([17, 0]), [1, 1])
    expect(state.positions[0]).toBe(19)
    expect(state.skipTurns[0]).toBe(1)
    expect(steps).toContainEqual({ kind: 'skip', seat: 0, turns: 1 })
  })

  it('releases the seat already in the well and takes its place', () => {
    const start = { ...gameAt([31, 29]), blocked: ['well' as const, null], turn: 1 }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.positions[1]).toBe(31)
    expect(state.blocked[1]).toBe('well')
    expect(state.blocked[0]).toBeNull()
    expect(state.positions[0]).toBe(29)
    expect(steps).toContainEqual({ kind: 'rescue', seat: 0, at: 31, to: 29 })
  })

  it('does not release anyone when the rescue rule is off', () => {
    const start = {
      ...gameAt([31, 29], { rescue: false }),
      blocked: ['well' as const, null],
      turn: 1,
    }
    const { state, steps } = applyRoll(start, [1, 1])
    expect(state.blocked[0]).toBe('well')
    expect(state.blocked[1]).toBe('well')
    expect(steps.some((s) => s.kind === 'rescue')).toBe(false)
  })

  it('does not release across different squares', () => {
    const start = { ...gameAt([52, 29], { rescue: true }), blocked: ['prison' as const, null], turn: 1 }
    const { state } = applyRoll(start, [1, 1])
    expect(state.blocked[0]).toBe('prison')
  })
})
```

La délivrance renvoie le siège libéré sur la case d'où venait son remplaçant, ce qui est la règle la plus répandue et la seule qui ne laisse pas deux pions bloqués sur la même case.

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/reducer-block.test.ts`
Expected : FAIL, `state.blocked[0]` vaut `null`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `applyRoll`, mémoriser la case de départ avant la première avance :

```ts
  const origin = next.positions[seat] ?? 0
```

Puis, dans la boucle, après la branche des téléports :

```ts
    if (effect?.kind === 'block') {
      /* Rescue is an effect of another seat arriving, not a timer: it belongs
         here, in the reducer, so it is testable without a clock. */
      if (next.config.rescue) {
        const held = next.blocked.findIndex(
          (reason, other) => other !== seat && reason !== null && next.positions[other] === square,
        )
        if (held >= 0) {
          next.blocked[held] = null
          next.positions[held] = origin
          steps.push({ kind: 'rescue', seat: held, at: square, to: origin })
        }
      }
      next.blocked[seat] = effect.reason
      steps.push({ kind: 'blocked', seat, at: square, reason: effect.reason })
      break
    }

    if (effect?.kind === 'inn') {
      next.skipTurns[seat] += effect.turns
      steps.push({ kind: 'skip', seat, turns: effect.turns })
      break
    }
```

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): block at the well and prison, release, and wait at the inn"
```

---

### Task 9: Ordre du tour, coups légaux et impasse

**Files:**
- Create: `packages/engine/src/rules.ts`
- Modify: `packages/engine/src/reducer.ts`, `packages/engine/src/index.ts`
- Test: `packages/engine/src/rules.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Move`.
- Produces:
  - `function legalMoves(state: GameState, seat: Seat): Move[]`
  - `function nextSeat(state: GameState): Seat | null` (null signifie que plus personne ne peut jouer)
  - `function canAct(state: GameState, seat: Seat): boolean`

- [ ] **Step 1: Écrire le test qui échoue**

`packages/engine/src/rules.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { applyRoll } from './reducer.js'
import { canAct, legalMoves, nextSeat } from './rules.js'
import { gameAt } from './test-helpers.js'

describe('rules', () => {
  it('offers a roll only to the seat whose turn it is', () => {
    const s = gameAt([1, 1])
    expect(legalMoves(s, 0)).toEqual(['roll'])
    expect(legalMoves(s, 1)).toEqual([])
  })

  it('offers nothing once the game is finished', () => {
    expect(legalMoves({ ...gameAt([63, 1]), finished: true, winner: 0 }, 0)).toEqual([])
  })

  it('offers nothing to a blocked seat', () => {
    expect(legalMoves({ ...gameAt([31, 1]), blocked: ['well', null] }, 0)).toEqual([])
  })

  it('skips a waiting seat and spends one of its waits', () => {
    const start = { ...gameAt([1, 1, 1]), skipTurns: [0, 1, 0] }
    const { state } = applyRoll(start, [1, 1])
    expect(state.turn).toBe(2)
    expect(state.skipTurns[1]).toBe(0)
  })

  it('skips a blocked seat without spending anything', () => {
    const start = { ...gameAt([1, 31, 1]), blocked: [null, 'well' as const, null] }
    const { state } = applyRoll(start, [1, 1])
    expect(state.turn).toBe(2)
    expect(state.blocked[1]).toBe('well')
  })

  it('reports no next seat when everyone is stuck', () => {
    const stuck = {
      ...gameAt([31, 52]),
      blocked: ['well' as const, 'prison' as const],
    }
    expect(nextSeat(stuck)).toBeNull()
    expect(canAct(stuck, 0)).toBe(false)
  })

  it('finishes the round with no winner when nobody can act', () => {
    const start = {
      ...gameAt([29, 52], { rescue: false }),
      blocked: [null, 'prison' as const],
      turn: 0,
    }
    const { state } = applyRoll(start, [1, 1]) // seat 0 lands in the well
    expect(state.blocked[0]).toBe('well')
    expect(state.finished).toBe(true)
    expect(state.winner).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run : `npx vitest run packages/engine/src/rules.test.ts`
Expected : FAIL, `Cannot find module './rules.js'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`rules.ts` :

```ts
import type { GameState, Move, Seat } from './types.js'

export function canAct(state: GameState, seat: Seat): boolean {
  return !state.finished && state.blocked[seat] === null
}

export function legalMoves(state: GameState, seat: Seat): Move[] {
  /* Thin on purpose in v1: there is exactly one thing to do on your turn.
     The shape is kept because phase 2 fills it with card plays, and the view
     and the wire do not have to change for that. */
  if (state.finished || state.turn !== seat) return []
  return canAct(state, seat) ? ['roll'] : []
}

/** The next seat that can act, or null when the table is deadlocked. */
export function nextSeat(state: GameState): Seat | null {
  for (let hop = 1; hop <= state.seatCount; hop++) {
    const candidate = (state.turn + hop) % state.seatCount
    if (state.blocked[candidate] === null) return candidate
  }
  return null
}
```

Dans `reducer.ts`, remplacer `next.turn = (seat + 1) % next.seatCount` par un passage de tour qui saute les sièges empêchés et consomme les attentes :

```ts
  /* Waiting is spent by being passed over, blocking is not: an inn costs one
     turn, a well costs turns until someone frees you. */
  let candidate = seat
  for (let hop = 1; hop <= next.seatCount; hop++) {
    candidate = (seat + hop) % next.seatCount
    if (next.blocked[candidate] !== null) continue
    if ((next.skipTurns[candidate] ?? 0) > 0) {
      next.skipTurns[candidate] -= 1
      continue
    }
    next.turn = candidate
    return { state: next, steps }
  }

  /* Nobody can act. With the rescue rule off, seats can be stuck for good, and
     a table that waits for a seat that will never move is worse than a round
     that ends. */
  next.finished = true
  next.winner = null
  return { state: next, steps }
```

Ajouter `export * from './rules.js'` à `index.ts`.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run packages/engine`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): advance the turn past blocked and waiting seats"
```

---

### Task 10: Ouverture 9, dé unique, classement et propriétés

**Files:**
- Create: `packages/engine/src/match.ts`, `packages/engine/src/invariants.test.ts`, `packages/engine/src/purity.test.ts`
- Modify: `packages/engine/src/reducer.ts`, `packages/engine/src/index.ts`
- Test: `packages/engine/src/reducer-opening.test.ts`, `packages/engine/src/match.test.ts`

**Interfaces:**
- Consumes: tout le moteur.
- Produces: `function ranking(state: GameState): Seat[]`, `function restart(state: GameState): GameState`

- [ ] **Step 1: Écrire les tests qui échouent**

`packages/engine/src/reducer-opening.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { createGame } from './init.js'
import { applyRoll } from './reducer.js'

describe('the opening nine', () => {
  const opening = () => createGame(2, { opening9: true })

  it('sends six and three to twenty-six', () => {
    const { state } = applyRoll(opening(), [6, 3])
    expect(state.positions[0]).toBe(26)
  })

  it('sends five and four to fifty-three', () => {
    const { state } = applyRoll(opening(), [5, 4])
    expect(state.positions[0]).toBe(53)
  })

  it('only applies on the very first roll of a seat', () => {
    const first = applyRoll(opening(), [1, 1]).state
    const second = applyRoll({ ...first, turn: 0 }, [6, 3]).state
    expect(second.positions[0]).not.toBe(26)
  })

  it('does nothing when the rule is off', () => {
    const { state } = applyRoll(createGame(2), [6, 3])
    expect(state.positions[0]).toBe(9)
  })

  it('plays a single die when two dice are off', () => {
    const { state } = applyRoll(createGame(2, { twoDice: false }), [4])
    expect(state.positions[0]).toBe(4)
  })
})
```

`packages/engine/src/invariants.test.ts` :

```ts
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from './board.js'
import { MAX_STEPS, applyRoll } from './reducer.js'
import { gameAt } from './test-helpers.js'

const die = fc.integer({ min: 1, max: 6 })

describe('engine invariants', () => {
  it('always terminates and stays on the board', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, fc.boolean(), (from, a, b, exact) => {
        const { state, steps } = applyRoll(gameAt([from, 0], { exactFinish: exact }), [a, b])
        expect(steps.length).toBeLessThanOrEqual(MAX_STEPS)
        const landed = state.positions[0] ?? -1
        expect(landed).toBeGreaterThanOrEqual(0)
        expect(landed).toBeLessThanOrEqual(BOARD_SIZE)
      }),
      { numRuns: 5000 },
    )
  })

  it('ends the chain on the square the last step points at', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, (from, a, b) => {
        const { state, steps } = applyRoll(gameAt([from, 0]), [a, b])
        const last = steps.filter((s) => 'to' in s).at(-1)
        if (last && 'to' in last) expect(state.positions[0]).toBe(last.to)
      }),
      { numRuns: 5000 },
    )
  })

  it('rebounds at most once per turn', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, (from, a, b) => {
        const { steps } = applyRoll(gameAt([from, 0]), [a, b])
        expect(steps.filter((s) => s.kind === 'bounce').length).toBeLessThanOrEqual(1)
      }),
      { numRuns: 5000 },
    )
  })

  it('never mutates the state it was given', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 62 }), die, die, (from, a, b) => {
        const before = gameAt([from, 0])
        const snapshot = JSON.stringify(before)
        applyRoll(before, [a, b])
        expect(JSON.stringify(before)).toBe(snapshot)
      }),
      { numRuns: 2000 },
    )
  })
})
```

`packages/engine/src/purity.test.ts` :

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/* The engine is pure. This is what makes the rules testable, replayable and
   reusable in a browser, and it is easier to keep than to restore. */
describe('engine purity', () => {
  const dir = new URL('.', import.meta.url).pathname
  const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

  it('imports nothing outside itself', () => {
    for (const file of sources) {
      const text = readFileSync(join(dir, file), 'utf8')
      const imports = [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')
      for (const spec of imports) expect(spec.startsWith('.')).toBe(true)
    }
  })

  it('declares no runtime dependency', () => {
    const pkg = JSON.parse(readFileSync(join(dir, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    expect(pkg.dependencies ?? {}).toEqual({})
  })
})
```

`test-helpers.ts` est un fichier source sans `.test.ts` mais il n'importe que du relatif, donc il passe.

`packages/engine/src/match.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { ranking, restart } from './match.js'
import { gameAt } from './test-helpers.js'

describe('match', () => {
  it('ranks by position, furthest first', () => {
    expect(ranking(gameAt([12, 40, 3]))).toEqual([1, 0, 2])
  })

  it('puts the winner first whatever the positions say', () => {
    const won = { ...gameAt([63, 62]), winner: 0, finished: true }
    expect(ranking(won)[0]).toBe(0)
  })

  it('resets positions and flags but keeps the seats and the config', () => {
    const played = { ...gameAt([30, 20], { twoDice: false }), winner: 0, finished: true }
    const fresh = restart(played)
    expect(fresh.positions).toEqual([0, 0])
    expect(fresh.blocked).toEqual([null, null])
    expect(fresh.skipTurns).toEqual([0, 0])
    expect(fresh.hasRolled).toEqual([false, false])
    expect(fresh.finished).toBe(false)
    expect(fresh.winner).toBeNull()
    expect(fresh.turn).toBe(0)
    expect(fresh.seatCount).toBe(2)
    expect(fresh.config.twoDice).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run packages/engine`
Expected : FAIL sur `match.js` introuvable et sur l'ouverture 9.

- [ ] **Step 3: Écrire les implémentations minimales**

Dans `applyRoll`, juste après `next.hasRolled[seat] = true`, et avant la première avance, insérer :

```ts
  const wasFirstRoll = state.hasRolled[seat] === false
  const opening =
    wasFirstRoll && next.config.opening9 && next.config.twoDice && by === 9
      ? dice.includes(6)
        ? 26
        : 53
      : null

  if (opening !== null) {
    const from = next.positions[seat] ?? 0
    next.positions[seat] = opening
    next.turn = nextTurnAfter(next, seat)
    return { state: next, steps: [{ kind: 'move', from, to: opening, by }] }
  }
```

Extraire le passage de tour de la tâche 9 dans une fonction `nextTurnAfter(state, seat): Seat` qui applique la même logique et pose `finished`/`winner` quand personne ne peut jouer, puis l'appeler des deux endroits. Cela évite de dupliquer la règle.

`match.ts` :

```ts
import type { GameState, Seat } from './types.js'

/** Furthest along first. The winner always leads, even on an inexact finish. */
export function ranking(state: GameState): Seat[] {
  const seats = Array.from({ length: state.seatCount }, (_, i) => i)
  return seats.sort((a, b) => {
    if (a === state.winner) return -1
    if (b === state.winner) return 1
    return (state.positions[b] ?? 0) - (state.positions[a] ?? 0)
  })
}

/** A rematch at the same table: same seats, same rules, everything else fresh. */
export function restart(state: GameState): GameState {
  const zeroes = (): number[] => Array.from({ length: state.seatCount }, () => 0)
  return {
    ...state,
    positions: zeroes(),
    blocked: Array.from({ length: state.seatCount }, () => null),
    skipTurns: zeroes(),
    hasRolled: Array.from({ length: state.seatCount }, () => false),
    turn: 0,
    winner: null,
    finished: false,
  }
}
```

Ajouter `export * from './match.js'` à `index.ts`.

- [ ] **Step 4: Lancer la suite complète et la couverture**

Run : `npm run verify && npx vitest run --coverage packages/engine`
Expected : PASS. La couverture de `packages/engine/src` doit dépasser 95 % en lignes. Si une branche du reducer n'est pas couverte, ajouter le test qui manque plutôt que de baisser le seuil.

- [ ] **Step 5: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): add the opening nine, ranking, restart and the invariant properties"
```

---

## Phase B : le wire

### Task 11: `@goose/protocol`

**Files:**
- Create: `packages/protocol/package.json`, `packages/protocol/tsconfig.build.json`
- Create: `packages/protocol/src/views.ts`, `packages/protocol/src/events.ts`, `packages/protocol/src/schemas.ts`, `packages/protocol/src/index.ts`
- Test: `packages/protocol/src/schemas.test.ts`, `packages/protocol/src/views.test.ts`

**Interfaces:**
- Consumes: `Step`, `TableConfig`, `Move`, `Seat`, `Square` depuis `@goose/engine`.
- Produces:
  - `type Presence = 'active' | 'disconnected' | 'left'`
  - `type SeatView = { seat: Seat; name: string; presence: Presence; position: Square; blocked: BlockReason | null; skipTurns: number; colour: string; handCount?: number }`
  - `type ChatLine = { seat: Seat | null; name: string; text: string; at: number }`
  - `type TableView = { code: string; phase: 'lobby' | 'playing' | 'over'; config: TableConfig; you: { seat: Seat; name: string }; host: Seat; seats: SeatView[]; turn: { seat: Seat; legalMoves: Move[]; deadlineAt: number | null }; lastTurn: { seat: Seat; dice: number[]; steps: Step[] } | null; winner: Seat | null; ranking: Seat[]; chat: ChatLine[] }`
  - `const clientSchemas` : un schéma Zod par action cliente
  - `type ClientEvent`, `type ServerEvent`

- [ ] **Step 1: Écrire les tests qui échouent**

`packages/protocol/src/schemas.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { clientSchemas } from './schemas.js'

describe('client schemas', () => {
  it('accepts a well-formed join', () => {
    const r = clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: 'Claire' })
    expect(r.success).toBe(true)
  })

  it('upper-cases and trims the room code', () => {
    const r = clientSchemas.joinRoom.parse({ code: ' hkd4p2 ', name: 'Claire' })
    expect(r.code).toBe('HKD4P2')
  })

  it('rejects a name that is empty or too long', () => {
    expect(clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: '' }).success).toBe(false)
    expect(
      clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: 'x'.repeat(25) }).success,
    ).toBe(false)
  })

  it('rejects a chat message that is empty or too long', () => {
    expect(clientSchemas.chat.safeParse({ text: '' }).success).toBe(false)
    expect(clientSchemas.chat.safeParse({ text: 'x'.repeat(501) }).success).toBe(false)
    expect(clientSchemas.chat.safeParse({ text: 'salut' }).success).toBe(true)
  })

  it('rejects an unknown table rule', () => {
    expect(clientSchemas.configureTable.safeParse({ nope: true }).success).toBe(false)
  })

  it('accepts a partial table configuration', () => {
    expect(clientSchemas.configureTable.safeParse({ twoDice: false }).success).toBe(true)
  })

  it('rejects a card mode that v1 cannot run', () => {
    expect(clientSchemas.configureTable.safeParse({ mode: 'cards' }).success).toBe(false)
  })

  it('accepts the roll action with no payload', () => {
    expect(clientSchemas.roll.safeParse({}).success).toBe(true)
  })

  it('declares playCard so phase two needs no wire change', () => {
    expect(clientSchemas.playCard).toBeDefined()
  })
})
```

`packages/protocol/src/views.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { TableView } from './views.js'

describe('TableView', () => {
  it('carries no hidden state a client could exploit', () => {
    const keys: Array<keyof TableView> = [
      'code',
      'phase',
      'config',
      'you',
      'host',
      'seats',
      'turn',
      'lastTurn',
      'winner',
      'ranking',
      'chat',
    ]
    // A compile-time check: adding a field to TableView without adding it here
    // fails the type, which is the reminder to think about what it exposes.
    expect(keys).toHaveLength(11)
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run packages/protocol`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Écrire l'implémentation minimale**

Ajouter `zod` aux dépendances de `packages/protocol/package.json` (`"dependencies": { "zod": "^4.1.12" }`) et `@goose/engine` en `dependencies` avec `"*"`.

`schemas.ts` :

```ts
import { z } from 'zod'

const name = z.string().trim().min(1).max(24)
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/)

export const clientSchemas = {
  createRoom: z.object({ name }),
  joinRoom: z.object({ code, name }),
  /* mode is deliberately absent: v1 refuses the card variant, and letting the
     schema accept it would push the refusal into the handler where it is
     easier to forget. */
  configureTable: z
    .object({
      exactFinish: z.boolean().optional(),
      twoDice: z.boolean().optional(),
      rescue: z.boolean().optional(),
      opening9: z.boolean().optional(),
    })
    .strict(),
  startGame: z.object({}).strict(),
  roll: z.object({}).strict(),
  chat: z.object({ text: z.string().trim().min(1).max(500) }),
  leaveRoom: z.object({}).strict(),
  restart: z.object({}).strict(),
  /* Phase 2. Declared so the wire never has to change, refused by the handler
     while the table runs in classic mode. */
  playCard: z.object({ cardId: z.string().max(64) }).strict(),
} as const

export type ClientEvent = keyof typeof clientSchemas
```

`views.ts` : les types listés dans les interfaces ci-dessus, sans logique.

`events.ts` :

```ts
import type { TableView } from './views.js'

export type ServerEvents = {
  tableView: (view: TableView) => void
  error: (payload: { code: string; message: string }) => void
}

export type ServerEvent = keyof ServerEvents
```

- [ ] **Step 4: Lancer les tests**

Run : `npm run verify`
Expected : exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/protocol package.json package-lock.json
git commit -m "feat(protocol): define the wire types and their zod schemas"
```

---

## Phase C : le serveur

### Task 12: Socle HTTP

**Files:**
- Create: `apps/server/package.json`, `apps/server/tsconfig.build.json`, `apps/server/.env.example`
- Create: `apps/server/src/config.ts`, `apps/server/src/logger.ts`, `apps/server/src/http.ts`, `apps/server/src/index.ts`
- Test: `apps/server/src/config.test.ts`, `apps/server/src/http.test.ts`

**Interfaces:**
- Consumes: rien du moteur.
- Produces: `function loadConfig(env: NodeJS.ProcessEnv): ServerConfig`, `function createApp(): express.Express`
  - `type ServerConfig = { port: number; behindTls: boolean; corsOrigin: string | null; logLevel: 'debug' | 'info' | 'warn' | 'error' }`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/server/src/config.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('defaults the port to 5050', () => {
    // Not 5000: macOS Control Center binds it for the AirPlay receiver, so a
    // 5000 default fails on any Mac with AirPlay on.
    expect(loadConfig({}).port).toBe(5050)
  })

  it('defaults BEHIND_TLS to false', () => {
    expect(loadConfig({}).behindTls).toBe(false)
    expect(loadConfig({ BEHIND_TLS: 'true' }).behindTls).toBe(true)
  })

  it('rejects a port that is not a number', () => {
    expect(() => loadConfig({ PORT: 'nope' })).toThrow(/PORT/)
  })
})
```

`apps/server/src/http.test.ts` :

```ts
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './http.js'

describe('http', () => {
  it('answers the health probe', async () => {
    const res = await request(createApp()).get('/healthz')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns 404 on an unknown api route', async () => {
    const res = await request(createApp()).get('/api/nope')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npm install -w @goose/server express socket.io && npm install -w @goose/server -D supertest @types/supertest @types/express && npx vitest run apps/server`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Écrire l'implémentation minimale**

`config.ts` :

```ts
export type ServerConfig = {
  port: number
  behindTls: boolean
  corsOrigin: string | null
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export function loadConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const port = env.PORT === undefined ? 5050 : Number(env.PORT)
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT must be a positive integer')
  return {
    port,
    /* Defaults to false so a plain `docker run` works. Traefik sets it, and
       the e2e suite proves the upgrade goes through with it on. */
    behindTls: env.BEHIND_TLS === 'true',
    corsOrigin: env.CORS_ORIGIN ?? null,
    logLevel: (env.LOG_LEVEL as ServerConfig['logLevel']) ?? 'info',
  }
}
```

`http.ts` : un Express qui sert `/healthz` puis les statiques de `apps/web/dist` en production.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run apps/server`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server package.json package-lock.json
git commit -m "feat(server): add the http skeleton, configuration and health probe"
```

---

### Task 13: `Room`, phase salon

**Files:**
- Create: `apps/server/src/rooms/room.ts`, `apps/server/src/rooms/room-code.ts`, `apps/server/src/views.ts`
- Test: `apps/server/src/rooms/room-lobby.test.ts`, `apps/server/src/rooms/room-code.test.ts`

**Interfaces:**
- Consumes: `createGame`, `DEFAULT_CONFIG`, `TableView`.
- Produces:
  - `class Room` avec `join(name: string, sessionId: string): Seat`, `leave(seat: Seat): void`, `setPresence(seat: Seat, presence: Presence): void`, `configure(seat: Seat, patch: Partial<TableConfig>): void`, `start(seat: Seat): void`, `view(seat: Seat): TableView`, et les lectures `code`, `phase`, `hostSeat`, `seatCount`
  - `function makeRoomCode(rng: Rng): string`

`Room` est synchrone et ne connaît aucun timer. Elle ne tire pas les dés : `RoomManager` le fait et les lui passe (tâche 14).

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/server/src/rooms/room-code.test.ts` :

```ts
import { makeRng } from '@goose/engine'
import { describe, expect, it } from 'vitest'
import { makeRoomCode } from './room-code.js'

describe('makeRoomCode', () => {
  it('produces six characters from an unambiguous alphabet', () => {
    const rng = makeRng(1)
    for (let i = 0; i < 500; i++) {
      const code = makeRoomCode(rng)
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    }
  })

  it('omits the characters that get misread aloud', () => {
    const rng = makeRng(2)
    const seen = new Set<string>()
    for (let i = 0; i < 3000; i++) for (const c of makeRoomCode(rng)) seen.add(c)
    for (const c of ['O', '0', 'I', '1', 'L']) expect(seen.has(c)).toBe(false)
  })
})
```

`apps/server/src/rooms/room-lobby.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { Room } from './room.js'

const room = () => new Room('HKD4P2')

describe('Room, lobby', () => {
  it('seats the first joiner as host on seat zero', () => {
    const r = room()
    expect(r.join('Jérémy', 's1')).toBe(0)
    expect(r.hostSeat).toBe(0)
  })

  it('seats joiners in order up to six', () => {
    const r = room()
    for (let i = 0; i < 6; i++) expect(r.join(`p${i}`, `s${i}`)).toBe(i)
    expect(() => r.join('p6', 's6')).toThrow(/full/i)
  })

  it('lets the host change the rules before the start', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    r.configure(0, { twoDice: false })
    expect(r.view(0).config.twoDice).toBe(false)
  })

  it('refuses a rule change from anyone but the host', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    expect(() => r.configure(1, { twoDice: false })).toThrow(/host/i)
  })

  it('refuses to start below two seats', () => {
    const r = room()
    r.join('host', 's0')
    expect(() => r.start(0)).toThrow(/two/i)
  })

  it('refuses a rule change once the game has started', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    r.start(0)
    expect(() => r.configure(0, { twoDice: false })).toThrow(/started/i)
  })

  it('shows a joining player their own seat and nobody else as you', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    expect(r.view(1).you).toEqual({ seat: 1, name: 'guest' })
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/server`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Écrire l'implémentation minimale**

`room-code.ts` :

```ts
import type { Rng } from '@goose/engine'

/* No O, 0, I, 1 or L: this code gets read out loud over a call, and the pairs
   that get misheard cost more than the six characters of entropy they add. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeRoomCode(rng: Rng): string {
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(rng() * ALPHABET.length)]).join('')
}
```

`room.ts` : la classe avec un tableau de membres `{ name, sessionId, presence }`, `phase`, `config`, et `game: GameState | null`. `view(seat)` délègue à `apps/server/src/views.ts`.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run apps/server`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server
git commit -m "feat(server): add the room, its code and the lobby phase"
```

---

### Task 14: `Room`, phase de jeu

**Files:**
- Modify: `apps/server/src/rooms/room.ts`, `apps/server/src/views.ts`
- Test: `apps/server/src/rooms/room-game.test.ts`, `apps/server/src/views.test.ts`

**Interfaces:**
- Consumes: `applyRoll`, `legalMoves`, `ranking`, `restart`.
- Produces: `Room.roll(seat: Seat, dice: number[]): void`, `Room.restart(seat: Seat): void`, `Room.chat(seat: Seat, text: string): void`, `Room.lastTurn`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/server/src/rooms/room-game.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { Room } from './room.js'

function started(): Room {
  const r = new Room('HKD4P2')
  r.join('a', 's0')
  r.join('b', 's1')
  r.start(0)
  return r
}

describe('Room, playing', () => {
  it('refuses a roll from a seat whose turn it is not', () => {
    expect(() => started().roll(1, [1, 1])).toThrow(/turn/i)
  })

  it('records the resolved turn so the client can replay it', () => {
    const r = started()
    r.roll(0, [1, 1])
    const view = r.view(0)
    expect(view.lastTurn?.seat).toBe(0)
    expect(view.lastTurn?.dice).toEqual([1, 1])
    expect(view.lastTurn?.steps[0]).toEqual({ kind: 'move', from: 0, to: 2, by: 2 })
  })

  it('offers legal moves only to the seat on turn', () => {
    const r = started()
    expect(r.view(0).turn.legalMoves).toEqual(['roll'])
    expect(r.view(1).turn.legalMoves).toEqual([])
  })

  it('moves to the over phase on a win', () => {
    const r = started()
    // Drive the game to the finish with explicit dice, one roll at a time.
    while (r.view(0).phase !== 'over') {
      const seat = r.view(0).turn.seat
      r.roll(seat, [6, 6])
    }
    expect(r.view(0).winner).not.toBeNull()
    expect(r.view(0).ranking).toHaveLength(2)
  })

  it('restarts with the same seats and the same rules', () => {
    const r = started()
    r.roll(0, [1, 1])
    r.restart(0)
    expect(r.view(0).phase).toBe('playing')
    expect(r.view(0).seats.map((s) => s.position)).toEqual([0, 0])
    expect(r.view(0).lastTurn).toBeNull()
  })

  it('keeps the chat log bounded', () => {
    const r = started()
    for (let i = 0; i < 300; i++) r.chat(0, `line ${i}`)
    expect(r.view(0).chat.length).toBeLessThanOrEqual(200)
    expect(r.view(0).chat.at(-1)?.text).toBe('line 299')
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/server/src/rooms/room-game.test.ts`
Expected : FAIL, `roll` n'existe pas.

- [ ] **Step 3: Écrire l'implémentation minimale**

`Room.roll` valide le tour et le nombre de dés attendu par la configuration, appelle `applyRoll`, stocke `{ seat, dice, steps }` dans `lastTurn`, et passe en phase `over` quand `finished` est vrai. `Room.restart` appelle `restart()` du moteur et remet `lastTurn` à `null`.

- [ ] **Step 4: Lancer les tests**

Run : `npm run verify`
Expected : exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/server
git commit -m "feat(server): resolve turns in the room and project them into the view"
```

---

### Task 15: `RoomManager`, horloge et timers injectés

**Files:**
- Create: `apps/server/src/rooms/room-manager.ts`
- Test: `apps/server/src/rooms/room-manager.test.ts`, `apps/server/src/rooms/room-presence.test.ts`

**Interfaces:**
- Consumes: `Room`, `makeRoomCode`, `Rng`.
- Produces:
  - `type Clock = { now(): number; setTimeout(fn: () => void, ms: number): symbol; clearTimeout(handle: symbol): void }`
  - `type ManagerDeps = { clock: Clock; rng: Rng; onView: (code: string) => void }`
  - `class RoomManager` avec `create(name, sessionId)`, `join(code, name, sessionId)`, `roll(code, seat)`, `disconnect(code, seat)`, `reconnect(code, sessionId)`, `get(code)`
  - `const TURN_TIMEOUT_MS = 60_000`, `const DISCONNECT_GRACE_MS = 90_000`
  - `function systemClock(): Clock`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/server/src/rooms/room-manager.test.ts` :

```ts
import { makeRng } from '@goose/engine'
import { describe, expect, it, vi } from 'vitest'
import { RoomManager, TURN_TIMEOUT_MS } from './room-manager.js'

/* A clock the test drives by hand. Nothing here ever waits: a suite that
   sleeps for a timeout is a suite nobody runs on every commit. */
function fakeClock() {
  let time = 0
  const timers = new Map<symbol, { at: number; fn: () => void }>()
  return {
    now: () => time,
    setTimeout(fn: () => void, ms: number) {
      const handle = Symbol('timer')
      timers.set(handle, { at: time + ms, fn })
      return handle
    },
    clearTimeout(handle: symbol) {
      timers.delete(handle)
    },
    advance(ms: number) {
      time += ms
      for (const [handle, t] of [...timers]) {
        if (t.at <= time) {
          timers.delete(handle)
          t.fn()
        }
      }
    },
  }
}

function manager() {
  const clock = fakeClock()
  const onView = vi.fn()
  const m = new RoomManager({ clock, rng: makeRng(1), onView })
  return { m, clock, onView }
}

describe('RoomManager', () => {
  it('rolls for an absent seat once the turn times out', () => {
    const { m, clock } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    expect(m.get(code)?.view(0).turn.seat).toBe(0)

    clock.advance(TURN_TIMEOUT_MS)

    // A goose turn has exactly one legal action, so auto-playing decides
    // nothing for the absent player. This is the difference with uno.
    expect(m.get(code)?.view(0).lastTurn?.seat).toBe(0)
    expect(m.get(code)?.view(0).turn.seat).toBe(1)
  })

  it('cancels the turn timer when the seat rolls in time', () => {
    const { m, clock } = manager()
    const code = m.create('a', 's0')
    m.join(code, 'b', 's1')
    m.start(code, 0)
    m.roll(code, 0)
    const after = m.get(code)?.view(0).lastTurn
    clock.advance(TURN_TIMEOUT_MS * 3)
    expect(m.get(code)?.view(0).lastTurn?.dice).toEqual(after?.dice)
  })

  it('publishes a view after every state change', () => {
    const { m, onView } = manager()
    const code = m.create('a', 's0')
    onView.mockClear()
    m.join(code, 'b', 's1')
    expect(onView).toHaveBeenCalledWith(code)
  })

  it('replays the same game from the same seed', () => {
    const play = () => {
      const clock = fakeClock()
      const m = new RoomManager({ clock, rng: makeRng(42), onView: () => {} })
      const code = m.create('a', 's0')
      m.join(code, 'b', 's1')
      m.start(code, 0)
      for (let i = 0; i < 20; i++) {
        const view = m.get(code)?.view(0)
        if (!view || view.phase === 'over') break
        m.roll(code, view.turn.seat)
      }
      return m.get(code)?.view(0).seats.map((s) => s.position)
    }
    expect(play()).toEqual(play())
  })
})
```

`apps/server/src/rooms/room-presence.test.ts` couvre : une déconnexion marque `disconnected` sans libérer la place ; une reconnexion avec le même `sessionId` retrouve le siège ; après `DISCONNECT_GRACE_MS` la place passe à `left` et le tour ne l'attend plus.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/server/src/rooms`
Expected : FAIL, module introuvable.

- [ ] **Step 3: Écrire l'implémentation minimale**

Écrire `RoomManager` avec un `Map<string, { room: Room; turnTimer: symbol | null; graceTimers: Map<Seat, symbol> }>`. Après chaque mutation, armer le timer de tour si la partie est en cours, et appeler `onView(code)`.

- [ ] **Step 4: Lancer les tests**

Run : `npm run verify`
Expected : exit 0. Le test complet doit tourner en moins de deux secondes : s'il attend, c'est qu'un `setTimeout` réel est passé au travers.

- [ ] **Step 5: Commit**

```bash
git add apps/server
git commit -m "feat(server): manage rooms, turn timeouts and presence behind an injected clock"
```

---

### Task 16: Les handlers Socket.IO et la limitation de débit

**Files:**
- Create: `apps/server/src/sockets/handlers.ts`, `apps/server/src/security/rate-limit.ts`
- Modify: `apps/server/src/index.ts`
- Test: `apps/server/src/sockets/handlers.test.ts`, `apps/server/src/security/rate-limit.test.ts`

**Interfaces:**
- Consumes: `clientSchemas`, `RoomManager`.
- Produces: `function registerHandlers(io: Server, manager: RoomManager): void`, `function makeRateLimiter(opts: { windowMs: number; max: number; clock: Clock }): (key: string) => boolean`

Rappel du piège : une nouvelle action cliente demande **quatre** choses, et c'est le handler qu'on oublie. Un type dans `events.ts`, un schéma Zod, un `socket.on`, et l'émission côté client. Le test de cette tâche vérifie que chaque clé de `clientSchemas` a bien un `socket.on`.

- [ ] **Step 1: Écrire le test qui échoue**

`apps/server/src/sockets/handlers.test.ts` :

```ts
import { clientSchemas } from '@goose/protocol'
import { describe, expect, it, vi } from 'vitest'
import { registerHandlers } from './handlers.js'

function fakeSocket() {
  const on = vi.fn()
  const emit = vi.fn()
  return { id: 'sock1', on, emit, join: vi.fn(), data: {} }
}

describe('handlers', () => {
  it('registers one listener per declared client action', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    const registered = socket.on.mock.calls.map((c) => c[0] as string)
    for (const action of Object.keys(clientSchemas)) {
      // The handler is the piece that gets forgotten. Testing both ends of a
      // chain proves nothing about the wire between them.
      expect(registered).toContain(action)
    }
  })

  it('rejects a payload that fails its schema without throwing', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    const chat = socket.on.mock.calls.find((c) => c[0] === 'chat')?.[1] as (p: unknown) => void
    expect(() => chat({ text: '' })).not.toThrow()
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'bad_payload' }))
  })

  it('refuses playCard while the table runs in classic mode', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    const play = socket.on.mock.calls.find((c) => c[0] === 'playCard')?.[1] as (p: unknown) => void
    play({ cardId: 'x' })
    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ code: 'mode_unsupported' }),
    )
  })
})
```

`apps/server/src/security/rate-limit.test.ts` : une clé au-delà du quota est refusée, la fenêtre se réinitialise après `windowMs` sur l'horloge injectée, deux clés distinctes ne se gênent pas.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/server/src/sockets apps/server/src/security`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Écrire l'implémentation minimale**

Un `socket.on` par clé de `clientSchemas`, chacun passant sa charge utile par `safeParse` puis appelant `RoomManager`. Les erreurs sont émises, jamais levées : une exception dans un handler Socket.IO tue la connexion sans rien dire au client.

- [ ] **Step 4: Lancer les tests**

Run : `npm run verify`
Expected : exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/server
git commit -m "feat(server): wire the socket handlers and rate limiting"
```

---

## Phase D : le client

### Task 17: Squelette web, tokens et internationalisation

**Files:**
- Create: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/tsconfig.json`
- Create: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles/tokens.css`, `apps/web/src/styles/app.css`
- Create: `apps/web/src/i18n/index.ts`, `apps/web/src/i18n/fr.ts`, `apps/web/src/i18n/en.ts`
- Test: `apps/web/src/i18n/i18n.test.ts`, `apps/web/src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `function t(key: string, vars?: Record<string, string | number>): string`, les tokens CSS de la direction Risographie.

Les valeurs viennent de `design/build.mjs`, qui est la source de vérité du design retenu.

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/web/src/i18n/i18n.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { en } from './en.js'
import { fr } from './fr.js'

describe('i18n', () => {
  it('translates the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
  })

  it('leaves no key untranslated', () => {
    for (const [key, value] of Object.entries(fr)) {
      expect(value.length, `fr.${key} is empty`).toBeGreaterThan(0)
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value.length, `en.${key} is empty`).toBeGreaterThan(0)
    }
  })

  it('uses no em dash anywhere', () => {
    for (const value of [...Object.values(fr), ...Object.values(en)]) {
      expect(value).not.toContain('\u2014')
    }
  })
})
```

`apps/web/src/styles/tokens.test.ts` :

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

describe('tokens', () => {
  it('declares the risograph inks the board reads from', () => {
    for (const token of [
      '--ink',
      '--paper',
      '--paper-raised',
      '--pink',
      '--teal',
      '--ochre',
      '--blue',
      '--gold',
    ]) {
      expect(css).toContain(`${token}:`)
    }
  })

  it('uses no ui-* font generic', () => {
    // One unsupported generic invalidates the whole font-family declaration.
    // Chrome dropped ui-rounded and rendered every heading in its default serif.
    expect(css).not.toMatch(/\bui-(rounded|serif|sans-serif|monospace)\b/)
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npm install -w @goose/web react react-dom socket.io-client && npm install -w @goose/web -D @vitejs/plugin-react vite @testing-library/react @testing-library/jest-dom jsdom && npx vitest run apps/web`
Expected : FAIL, fichiers introuvables.

- [ ] **Step 3: Écrire l'implémentation minimale**

`tokens.css` :

```css
/* Risograph direction, chosen over three others recorded on the design canvas.
   Flat inks that overprint rather than blend, so the board reads at 46px per
   square on a phone and at 600px on a projector. */
@font-face {
  font-family: 'Archivo Black';
  src: url('../assets/fonts/archivo-black.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

:root {
  --ink: #1b2a4a;
  --paper: #f0e9d8;
  --paper-raised: #faf5e8;
  --dim: #5b6a86;

  --pink: #ff4f7b;
  --teal: #1fb3a6;
  --ochre: #f2a03d;
  --blue: #5b7cff;
  --gold: #ffd93d;

  --square-goose: var(--teal);
  --square-move: var(--blue);
  --square-trap: var(--ochre);
  --square-death: var(--pink);
  --square-garden: var(--gold);

  --step--1: 0.8125rem;
  --step-0: 1rem;
  --step-1: 1.3rem;
  --step-2: 1.85rem;
  --step-3: 2.6rem;

  --display: 'Archivo Black', 'Helvetica Neue', Impact, sans-serif;
  --body: 'Archivo', 'Helvetica Neue', Helvetica, sans-serif;
  --data: 'Space Mono', ui-monospace, Menlo, monospace;

  --shadow-hard: 6px 6px 0 var(--ink);
}
```

Le test interdit les génériques `ui-*` : remplacer `ui-monospace` par `SFMono-Regular` dans `--data` avant de lancer.

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run apps/web`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web package.json package-lock.json
git commit -m "feat(web): scaffold the client with the risograph tokens and i18n"
```

---

### Task 18: La géométrie et les deux rendus du plateau

**Files:**
- Create: `apps/web/src/lib/board-layout.ts`, `apps/web/src/components/BoardSpiral.tsx`, `apps/web/src/components/BoardGrid.tsx`, `apps/web/src/components/Board.tsx`
- Test: `apps/web/src/lib/board-layout.test.ts`, `apps/web/src/components/Board.test.tsx`

**Interfaces:**
- Consumes: `GEESE`, `effectAt`, `BOARD_SIZE` depuis `@goose/engine`.
- Produces:
  - `type Point = { n: number; x: number; y: number }`
  - `function spiralPoints(opts: { size: number; cellRadius: number }): Point[]` (62 points, la case 63 est le médaillon central)
  - `function gridCells(opts: { cols: number; cell: number; gap: number }): Array<Point & { w: number; h: number }>` (63 cellules)
  - `const BOARD_GRID_BREAKPOINT = 700`
  - Composants `BoardSpiral`, `BoardGrid`, `Board`, tous prenant `{ seats: SeatView[]; highlight: Square | null }`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/web/src/lib/board-layout.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { gridCells, spiralPoints } from './board-layout.js'

describe('spiralPoints', () => {
  const pts = spiralPoints({ size: 600, cellRadius: 25 })

  it('lays out the sixty-two squares that are not the garden', () => {
    expect(pts).toHaveLength(62)
    expect(pts.map((p) => p.n)).toEqual(Array.from({ length: 62 }, (_, i) => i + 1))
  })

  it('keeps every square inside the viewport', () => {
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(25)
      expect(p.x).toBeLessThanOrEqual(575)
      expect(p.y).toBeGreaterThanOrEqual(25)
      expect(p.y).toBeLessThanOrEqual(575)
    }
  })

  it('winds inward without ever going back out', () => {
    const radius = (p: { x: number; y: number }) => Math.hypot(p.x - 300, p.y - 300)
    for (let i = 1; i < pts.length; i++) {
      expect(radius(pts[i]!)).toBeLessThanOrEqual(radius(pts[i - 1]!) + 0.001)
    }
  })

  it('never overlaps two consecutive squares', () => {
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y)
      expect(d).toBeGreaterThan(2 * 25 * 0.9)
    }
  })

  it('leaves room at the centre for the garden medallion', () => {
    const last = pts.at(-1)!
    expect(Math.hypot(last.x - 300, last.y - 300)).toBeGreaterThan(60)
  })
})

describe('gridCells', () => {
  const cells = gridCells({ cols: 7, cell: 46, gap: 5 })

  it('lays out all sixty-three squares', () => {
    expect(cells).toHaveLength(63)
  })

  it('starts at the bottom left and snakes upward', () => {
    const one = cells.find((c) => c.n === 1)!
    const eight = cells.find((c) => c.n === 8)!
    const seven = cells.find((c) => c.n === 7)!
    expect(one.x).toBeLessThan(seven.x)
    expect(eight.y).toBeLessThan(one.y)
    expect(eight.x).toBe(seven.x)
  })
})
```

`apps/web/src/components/Board.test.tsx` : rend `Board` dans un conteneur de 400 px et vérifie que `BoardGrid` est monté ; puis à 1000 px, que `BoardSpiral` l'est. Utiliser un stub de `ResizeObserver` dans `test-setup.ts`.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/web/src/lib/board-layout.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Step 3: Écrire l'implémentation minimale**

Reprendre la fonction `spiral` de `design/build.mjs`, qui est déjà la géométrie validée visuellement, et la porter en TypeScript. Les paramètres retenus : `pitch` et `step` tous deux à `size * 0.0906`, départ à `theta = PI / 2`, sens anti-horaire.

`Board.tsx` bascule sur la largeur du **conteneur** via `ResizeObserver`, pas sur une media query :

```tsx
/* The board lives in a flex column next to a chat rail, so the window width
   says nothing about the room it actually has. */
```

- [ ] **Step 4: Lancer les tests**

Run : `npx vitest run apps/web`
Expected : PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): compute the spiral geometry and switch to the grid on narrow containers"
```

---

### Task 19: Socket, réducteur client et écrans d'entrée

**Files:**
- Create: `apps/web/src/hooks/useGameSocket.ts`, `apps/web/src/hooks/game-reducer.ts`, `apps/web/src/lib/session.ts`, `apps/web/src/lib/room-url.ts`
- Create: `apps/web/src/screens/Home.tsx`, `apps/web/src/screens/Lobby.tsx`, `apps/web/src/components/TableRulesPanel.tsx`
- Test: `apps/web/src/hooks/game-reducer.test.ts`, `apps/web/src/screens/Home.test.tsx`, `apps/web/src/screens/Lobby.test.tsx`

**Interfaces:**
- Consumes: `TableView`, `clientSchemas`.
- Produces: `function useGameSocket(): { view: TableView | null; status: 'connecting' | 'open' | 'closed'; send: Send }`, avec `type Send = <E extends ClientEvent>(event: E, payload: PayloadOf<E>) => void`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/web/src/hooks/game-reducer.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { type ClientState, initialState, reduce } from './game-reducer.js'

const view = { code: 'HKD4P2', phase: 'lobby' } as never

describe('game-reducer', () => {
  it('starts with no view and a connecting socket', () => {
    expect(initialState).toEqual<ClientState>({ view: null, status: 'connecting', error: null })
  })

  it('stores the view the server sent, without deriving anything from it', () => {
    const next = reduce(initialState, { type: 'view', view })
    expect(next.view).toBe(view)
  })

  it('clears a previous error when a view arrives', () => {
    const errored = reduce(initialState, { type: 'error', error: 'room_full' })
    expect(reduce(errored, { type: 'view', view }).error).toBeNull()
  })

  it('keeps the last view when the socket drops, so the table does not blank', () => {
    const open = reduce(initialState, { type: 'view', view })
    const dropped = reduce(open, { type: 'status', status: 'closed' })
    expect(dropped.view).toBe(view)
    expect(dropped.status).toBe('closed')
  })
})
```

`Home.test.tsx` : le formulaire de création exige un nom ; le formulaire de rejoint met le code en majuscules ; un code invalide n'émet rien.
`Lobby.test.tsx` : l'hôte voit les interrupteurs actifs ; un invité les voit désactivés ; `opening9` est grisé quand `twoDice` est décoché.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/web/src/hooks apps/web/src/screens`
Expected : FAIL, modules introuvables.

- [ ] **Step 3: Écrire l'implémentation minimale**

`game-reducer.ts` ne contient aucune règle de jeu :

```ts
/* The client knows no rules. The server ships legalMoves inside each view; this
   reducer stores what arrived and nothing else. Deriving a rule here is how the
   two sides drift apart. */
```

- [ ] **Step 4: Lancer les tests**

Run : `npm run verify`
Expected : exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): connect the socket and add the home and lobby screens"
```

---

### Task 20: L'écran de table et la mise en scène de la chaîne

**Files:**
- Create: `apps/web/src/screens/Table.tsx`, `apps/web/src/components/Die.tsx`, `apps/web/src/components/Seat.tsx`, `apps/web/src/components/ChatPanel.tsx`, `apps/web/src/components/GameOver.tsx`
- Create: `apps/web/src/hooks/useStepPlayback.ts`, `apps/web/src/lib/describe-step.ts`
- Test: `apps/web/src/hooks/useStepPlayback.test.ts`, `apps/web/src/lib/describe-step.test.ts`, `apps/web/src/screens/Table.test.tsx`

**Interfaces:**
- Consumes: `TableView`, `Step`, `Board`.
- Produces:
  - `function useStepPlayback(lastTurn: TableView['lastTurn'], opts: { stepMs: number }): { square: Square | null; index: number; done: boolean }`
  - `function describeStep(step: Step, names: string[]): string`

- [ ] **Step 1: Écrire les tests qui échouent**

`apps/web/src/lib/describe-step.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { describeStep } from './describe-step.js'

const names = ['Jérémy', 'Claire']

describe('describeStep', () => {
  it('narrates a plain move', () => {
    expect(describeStep({ kind: 'move', from: 2, to: 9, by: 7 }, names)).toContain('9')
  })

  it('names the square that fired', () => {
    expect(describeStep({ kind: 'bridge', from: 6, to: 12 }, names)).toMatch(/pont/i)
    expect(describeStep({ kind: 'death', from: 58, to: 1 }, names)).toMatch(/mort/i)
    expect(describeStep({ kind: 'maze', from: 42, to: 30 }, names)).toMatch(/labyrinthe/i)
  })

  it('names the seat a rescue frees', () => {
    expect(describeStep({ kind: 'rescue', seat: 1, at: 31, to: 20 }, names)).toContain('Claire')
  })

  it('never emits an em dash', () => {
    const all = [
      describeStep({ kind: 'move', from: 1, to: 2, by: 1 }, names),
      describeStep({ kind: 'goose', from: 5, to: 7, by: 2 }, names),
      describeStep({ kind: 'bounce', from: 66, to: 60, overshoot: 3 }, names),
      describeStep({ kind: 'win', seat: 0, at: 63 }, names),
    ]
    for (const line of all) expect(line).not.toContain('\u2014')
  })
})
```

`useStepPlayback.test.ts` : avec des timers factices, la lecture avance d'une étape tous les `stepMs`, s'arrête à la dernière, et repart de zéro quand un nouveau `lastTurn` arrive.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npx vitest run apps/web/src/lib/describe-step.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Step 3: Écrire l'implémentation minimale**

`useStepPlayback` lit `lastTurn.steps` et rend la case courante. Le pion se déplace de cette case à la suivante, et le fil de partie affiche `describeStep`. Aucune règle n'est recalculée : la chaîne vient du serveur.

- [ ] **Step 4: Lancer les tests et regarder la page pour de vrai**

Run : `npm run verify`
Puis, dans deux terminaux : `npm start -w @goose/server` et `npm run dev -w @goose/web`, et ouvrir <http://localhost:5173> dans deux onglets pour jouer une partie à deux.

Juger la mise en page en mesurant la géométrie dans le navigateur, pas en lisant une capture, et échantillonner après stabilisation des transitions.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): play the resolution chain back on the table screen"
```

---

## Phase E : livrer

### Task 21: Image Docker et composition

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `compose.yaml`, `compose.traefik.yaml`
- Create: `scripts/check-node-versions.sh`
- Test: `scripts/check-node-versions.test.sh` (invoqué par la CI en tâche 22)

**Interfaces:**
- Consumes: le build de la tâche 1.
- Produces: une image qui sert l'API, les WebSockets et les statiques sur un seul port.

- [ ] **Step 1: Écrire le garde-fou qui échoue**

`scripts/check-node-versions.sh` :

```bash
#!/usr/bin/env bash
# The image once shipped Node 22 while everything else validated 24. The floor
# in `engines` is what this supports; `.nvmrc` is what it runs on. They are not
# the same number, and the Dockerfile must follow .nvmrc.
set -euo pipefail

nvmrc="$(tr -d '[:space:]' < .nvmrc)"
dockerfile_node="$(grep -oE '^FROM node:[0-9]+' Dockerfile | head -1 | cut -d: -f2)"

if [[ "$nvmrc" != "$dockerfile_node" ]]; then
  echo "Dockerfile pins node ${dockerfile_node} but .nvmrc says ${nvmrc}" >&2
  exit 1
fi
echo "node ${nvmrc} in both .nvmrc and Dockerfile"
```

- [ ] **Step 2: Lancer le script pour le voir échouer**

Run : `chmod +x scripts/check-node-versions.sh && ./scripts/check-node-versions.sh`
Expected : FAIL, `Dockerfile` absent.

- [ ] **Step 3: Écrire le Dockerfile et les compositions**

`Dockerfile` multi-étages : `FROM node:26-alpine` pour le build (`npm ci`, `npm run build`), puis une étape d'exécution qui copie `dist/` et `node_modules` de production, tourne en utilisateur non-root, expose 5050 et déclare un `HEALTHCHECK` sur `/healthz`.

`compose.traefik.yaml` : quatre labels de routage, `BEHIND_TLS=true`, **aucun** mapping `ports:`, réseau en `external: true`.

- [ ] **Step 4: Vérifier de bout en bout**

Run : `./scripts/check-node-versions.sh && docker compose up --build -d && curl -fsS http://localhost:5050/healthz && docker compose down`
Expected : `{"status":"ok"}`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore compose.yaml compose.traefik.yaml scripts/
git commit -m "chore(docker): build a single-port image and guard the node version"
```

---

### Task 22: GitHub Actions, hooks et conventions de commit

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/github-actions.yml`
- Create: `cog.toml`, `.pre-commit-config.yaml`
- Modify: `README.md`

**Interfaces:**
- Consumes: les scripts npm de la tâche 1, le script de la tâche 21.
- Produces: un pipeline qui publie l'image sur push vert sur `main`.

Les trois workflows sont repris de `uno-multiplayer/.github/workflows/`. Les copier puis adapter, plutôt que de les réécrire : ils portent des décisions déjà payées, dont l'épinglage des actions par SHA et la publication de l'image que le pipeline a bootée.

- [ ] **Step 1: Copier et adapter**

```bash
mkdir -p .github/workflows
cp ../uno-multiplayer/.github/workflows/*.yml .github/workflows/
cp ../uno-multiplayer/cog.toml ../uno-multiplayer/.pre-commit-config.yaml .
command sed -i '' 's/uno-multiplayer/goose-multiplayer/g; s/@uno\//@goose\//g' \
  .github/workflows/*.yml cog.toml .pre-commit-config.yaml
```

- [ ] **Step 2: Ajouter le garde-fou de version Node au job qualité**

Dans `.github/workflows/ci.yml`, après `npm ci` du job `quality` :

```yaml
      - name: Node version agreement
        run: ./scripts/check-node-versions.sh
```

- [ ] **Step 3: Relire chaque workflow ligne à ligne**

Vérifier que chaque référence à uno a disparu, que les permissions restent au minimum nécessaire, que les actions sont épinglées par SHA, et que `format:check` et `build` tournent bien en CI. Ce sont eux que `npm run verify` ne couvre pas, et c'est comme ça qu'un fichier non formaté est passé en local et a cassé la CI.

Run : `command grep -rn "uno" .github/ cog.toml .pre-commit-config.yaml`
Expected : aucun résultat.

- [ ] **Step 4: Valider la syntaxe et lancer la CI**

Run : `npm run verify && git push` (une fois le remote GitHub créé), puis vérifier que les trois workflows passent au vert.

- [ ] **Step 5: Commit**

```bash
git add .github cog.toml .pre-commit-config.yaml README.md
git commit -m "ci: add the quality, test and release workflows"
```

---

### Task 23: Parcours Playwright, dont une table à six

**Files:**
- Create: `playwright.config.ts`, `e2e/tsconfig.json`
- Create: `e2e/lobby.spec.ts`, `e2e/game.spec.ts`, `e2e/six-players.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: l'application complète.
- Produces: la preuve que le wire fonctionne à travers un vrai Traefik.

- [ ] **Step 1: Écrire le parcours qui échoue**

`e2e/game.spec.ts` :

```ts
import { expect, test } from '@playwright/test'

test('two players finish a game through the real stack', async ({ browser }) => {
  const host = await browser.newPage()
  const guest = await browser.newPage()

  await host.goto('/')
  await host.getByLabel('Ton nom').fill('Jérémy')
  await host.getByRole('button', { name: 'Créer une table' }).click()

  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? ''
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)

  await guest.goto('/')
  await guest.getByLabel('Ton nom').fill('Claire')
  await guest.getByLabel('Code de la table').fill(code)
  await guest.getByRole('button', { name: 'Rejoindre' }).click()

  await expect(host.getByText('Claire')).toBeVisible()
  await host.getByRole('button', { name: 'Commencer la partie' }).click()

  // Play until somebody reaches the garden. Testing both ends of a chain
  // proves nothing about the wire between them: this is the level that does.
  for (let turn = 0; turn < 400; turn++) {
    const over = await host.getByTestId('game-over').isVisible()
    if (over) break
    for (const page of [host, guest]) {
      const roll = page.getByRole('button', { name: 'Lancer les dés' })
      if (await roll.isEnabled().catch(() => false)) await roll.click()
    }
    await host.waitForTimeout(60)
  }

  await expect(host.getByTestId('game-over')).toBeVisible()
  await expect(guest.getByTestId('game-over')).toBeVisible()
})
```

`e2e/six-players.spec.ts` : six pages, une table pleine, un septième qui se voit refuser l'entrée, puis une partie jouée jusqu'au bout.

`e2e/lobby.spec.ts` : rejoindre par lien direct, changer une règle en tant qu'hôte, la voir apparaître chez l'invité, vérifier qu'un invité ne peut pas la changer.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run : `npm install -D @playwright/test && npx playwright install --with-deps chromium && npx playwright test`
Expected : FAIL, l'application ne se lance pas encore sous Playwright.

- [ ] **Step 3: Configurer Playwright contre un vrai Traefik**

`playwright.config.ts` monte la pile via `compose.traefik.yaml` dans `webServer`, pointe `baseURL` sur l'hôte Traefik local, et attend `/healthz`. Aucune configuration WebSocket n'est nécessaire : Traefik proxie la montée en charge lui-même, et c'est exactement ce que ce test vérifie plutôt que de le supposer.

- [ ] **Step 4: Lancer la suite**

Run : `npx playwright test`
Expected : PASS, trois fichiers.

Ajouter le job e2e à `ci.yml`.

- [ ] **Step 5: Commit**

```bash
git add e2e playwright.config.ts .github/workflows/ci.yml package.json package-lock.json
git commit -m "test(e2e): play full two and six player games through traefik"
```

---

## Revue du plan contre la spec

| Section de la spec | Tâche qui la couvre |
| --- | --- |
| §1 critères de succès 1 à 5 | 23, 16, 15, 20, 22 |
| §3 les oies | 6 |
| §3 les cases à effet | 2, 7, 8 |
| §3 les trois règles de terminaison | 6, 7, 10 (propriétés) |
| §3 les règles de table | 4, 10, 13, 19 |
| §3 blocages, attente, ordre du tour | 8, 9 |
| §3 cas limite tout le monde bloqué | 9 |
| §4 découpage et invariants | 1, 10 (test de pureté), 13, 15 |
| §4 l'autorité serveur | 15 (le serveur tire), 14 (le serveur calcule), 19 (le client ne dérive rien) |
| §5 le modèle du tour | 5 à 9, 20 (mise en scène) |
| §6 cycle de vie de la table | 13, 14, 15 |
| §6 timer de tour et auto-lancer | 15 |
| §7 protocol et vue | 11, 16 |
| §8 point d'extension phase 2 | 4 (`hands?`), 11 (`playCard`), 16 (refus testé) |
| §9 rendu du plateau | 18 |
| §10 tests | présent dans chaque tâche, plus 10 et 23 |
| §11 CI, image, déploiement | 21, 22 |

**Trous connus, assumés :** la spec mentionne un fil de partie et un chat ; ils sont couverts par les tâches 14 et 20 mais sans test e2e dédié, la partie e2e se concentrant sur le déroulement du jeu. La spec ne fixe pas la couleur attribuée à chaque siège ; la tâche 11 la place dans `SeatView.colour` et la tâche 13 l'assigne dans l'ordre des sièges à partir des encres de `tokens.css`.
