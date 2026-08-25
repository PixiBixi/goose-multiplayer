/* What this exists to prove.

   The well (31) and the prison (52) used to have exactly one exit: another
   seat landing on that same square out of 63. Measured over thousands of
   games, that made falling in an elimination rather than a setback, and the
   share of games ENDING with a seat still blocked was the same number as the
   share of games with a blocked seat at all. This script is the measurement
   that says so, kept in the repo so the claim can be re-checked rather than
   believed, and so anyone tempted to "simplify" the exits back to rescue only
   has to answer the numbers first.

   It plays whole games against the BUILT engine (dist), never against a copy
   of the rules, and reports per format:
     - the share of games where at least one seat was ever blocked
     - the total number of rescues
     - the average and worst number of turns a seat spent blocked
     - the share of games that END with somebody still blocked
     - how the seats that got out got out: double, rescue, or turn cap

   "Turns spent blocked" is counted in the blocked seat's OWN turns: the times
   the turn came round to it while it was in the hole, whether it was passed
   over or rolled for its freedom. That is the quantity `maxBlockedTurns`
   bounds, so it is the one worth printing.

   Run: node scripts/measure-blocking.ts [games-per-format]
*/
import { applyRoll, createGame, makeRng, rollDice } from '@goose/engine'
import type { GameState, Step } from '@goose/engine'

const FORMATS = [2, 4, 6]
const DEFAULT_GAMES = 2000
/* A hung game is a bug, not a long game: this is a tripwire, not a rule. */
const MAX_ROLLS = 20_000

type Exit = 'double' | 'rescue' | 'cap'

type Tally = {
  seats: number
  games: number
  gamesWithBlock: number
  gamesEndingBlocked: number
  episodes: number
  turnsBlocked: number
  worstTurnsBlocked: number
  exits: Record<Exit, number>
  aborted: number
}

function emptyTally(seats: number): Tally {
  return {
    seats,
    games: 0,
    gamesWithBlock: 0,
    gamesEndingBlocked: 0,
    episodes: 0,
    turnsBlocked: 0,
    worstTurnsBlocked: 0,
    exits: { double: 0, rescue: 0, cap: 0 },
    aborted: 0,
  }
}

/* The seats the turn pointer walked past on its way from `from` to `to`. The
   engine hands the turn to the next seat that can act, so everyone in between
   was passed over, and a pointer that comes back to the seat it started on
   without a double means it lapped the whole table. */
function passedOver(from: number, to: number, seats: number, rolledAgain: boolean): number[] {
  if (rolledAgain) return []
  const distance = (seat: number): number => (seat - from + seats) % seats
  const lap = to === from ? seats : distance(to)
  const walked: number[] = []
  for (let seat = 0; seat < seats; seat++) {
    const d = distance(seat)
    if (d >= 1 && d < lap) walked.push(seat)
  }
  return walked
}

function exitOf(step: Step): { seat: number; exit: Exit } | null {
  switch (step.kind) {
    case 'rescue':
      return { seat: step.seat, exit: 'rescue' }
    /* Read off the step kinds, never off the config: the engine is the only
       thing that knows which rule opened the door. The two below do not exist
       before the change this script measures, hence the guarded lookup. */
    case 'escape':
      return { seat: step.seat, exit: 'double' }
    case 'freed':
      return { seat: step.seat, exit: 'cap' }
    default:
      return null
  }
}

function playGame(seats: number, seed: number, tally: Tally): void {
  let state: GameState = createGame(seats)
  const dieCount = state.config.twoDice ? 2 : 1
  const rng = makeRng(seed)
  /* Turns spent in the current episode, per seat. -1 means "not blocked". */
  const spent: number[] = Array.from({ length: seats }, () => -1)
  let everBlocked = false

  const close = (seat: number): void => {
    const turns = spent[seat] ?? -1
    if (turns < 0) return
    tally.episodes += 1
    tally.turnsBlocked += turns
    tally.worstTurnsBlocked = Math.max(tally.worstTurnsBlocked, turns)
    spent[seat] = -1
  }

  let rolls = 0
  while (!state.finished) {
    if (rolls >= MAX_ROLLS) {
      tally.aborted += 1
      break
    }
    rolls += 1
    const from = state.turn
    /* A seat that rolls while blocked is spending one of its own turns on an
       escape attempt, exactly like a seat that gets passed over spends one. */
    if (state.blocked[from] !== null) spent[from] = (spent[from] ?? 0) + 1

    const { state: after, steps } = applyRoll(state, rollDice(rng, dieCount as 1 | 2))
    state = after

    for (const step of steps) {
      if (step.kind === 'blocked') {
        everBlocked = true
        spent[step.seat] = 0
        continue
      }
      const out = exitOf(step)
      if (out === null) continue
      tally.exits[out.exit] += 1
      close(out.seat)
    }

    /* Off the engine's own step, never off the turn pointer: a pointer that
       comes back to the seat that just rolled means either a double kept the
       turn or the whole table was passed over, and only the step tells them
       apart. */
    const keptTheTurn = steps.some((step) => step.kind === 'double')
    if (state.finished) continue
    for (const seat of passedOver(from, state.turn, seats, keptTheTurn)) {
      const turns = spent[seat] ?? -1
      if (turns >= 0) spent[seat] = turns + 1
    }
  }

  tally.games += 1
  if (everBlocked) tally.gamesWithBlock += 1
  if (state.blocked.some((reason) => reason !== null)) tally.gamesEndingBlocked += 1
  for (let seat = 0; seat < seats; seat++) close(seat)
}

function share(part: number, whole: number): string {
  return whole === 0 ? '0%' : `${((part / whole) * 100).toFixed(1)}%`
}

function report(tallies: Tally[]): string {
  const lines = [
    '| Format | Parties avec un siège bloqué | Sauvetages | Tours bloqués (moyenne) | Pire cas | Parties finissant avec un bloqué |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const t of tallies) {
    const average = t.episodes === 0 ? 0 : t.turnsBlocked / t.episodes
    lines.push(
      `| ${String(t.seats)} joueurs | ${share(t.gamesWithBlock, t.games)} | ${String(t.exits.rescue)} | ${average.toFixed(1)} | ${String(t.worstTurnsBlocked)} | ${share(t.gamesEndingBlocked, t.games)} |`,
    )
  }

  lines.push('')
  lines.push('| Format | Sorties par double | Sorties par sauvetage | Sorties au plafond |')
  lines.push('| --- | --- | --- | --- |')
  for (const t of tallies) {
    const total = t.exits.double + t.exits.rescue + t.exits.cap
    lines.push(
      `| ${String(t.seats)} joueurs | ${String(t.exits.double)} (${share(t.exits.double, total)}) | ${String(t.exits.rescue)} (${share(t.exits.rescue, total)}) | ${String(t.exits.cap)} (${share(t.exits.cap, total)}) |`,
    )
  }

  const aborted = tallies.reduce((sum, t) => sum + t.aborted, 0)
  if (aborted > 0) {
    lines.push('', `WARNING: ${String(aborted)} games hit the ${String(MAX_ROLLS)} roll tripwire.`)
  }
  return lines.join('\n')
}

const games = Number(process.argv[2] ?? DEFAULT_GAMES)
if (!Number.isInteger(games) || games < 1) {
  throw new Error(`games per format must be a positive integer, got ${String(process.argv[2])}`)
}

const tallies = FORMATS.map((seats) => {
  const tally = emptyTally(seats)
  /* Seeded, so two runs of the same build print the same table and a change
     in the numbers means a change in the rules. */
  for (let game = 0; game < games; game++) playGame(seats, seats * 1_000_003 + game, tally)
  return tally
})

console.log(`${String(games)} games per format, engine defaults:`)
console.log(JSON.stringify(createGame(2).config))
console.log('')
console.log(report(tallies))
