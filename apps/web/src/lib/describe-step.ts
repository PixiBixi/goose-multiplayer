import { BOARD_SIZE } from '@goose/engine'
import type { Square, Step } from '@goose/engine'
import { t } from '../i18n/index.js'

/* The chain is the server's account of what happened. Nothing here recomputes
   it: this turns one step into a line of French and into the square the pawn
   stands on while that step is on screen. */
export function describeStep(step: Step, names: string[]): string {
  const who = (seat: number): string => names[seat] ?? `#${seat + 1}`
  switch (step.kind) {
    case 'move':
      return t('step.move', { by: step.by, from: step.from, to: step.to })
    case 'opening9':
      /* The dice are the reason for the destination, so they are what the line
         says. Which pair goes where is the engine's business, not this one's. */
      return t('step.opening9', { a: step.dice[0] ?? 0, b: step.dice[1] ?? 0, to: step.to })
    case 'goose':
      return t('step.goose', { from: step.from, by: step.by, to: step.to })
    case 'bounce':
      return t('step.bounce', { overshoot: step.overshoot, to: step.to })
    case 'overshoot':
      return t('step.overshoot', { overshoot: step.overshoot, to: step.to })
    case 'bridge':
      return t('step.bridge', { to: step.to })
    case 'dice':
      return t('step.dice', { to: step.to })
    case 'maze':
      return t('step.maze', { to: step.to })
    case 'death':
      return t('step.death', { to: step.to })
    case 'blocked':
      return t(step.reason === 'well' ? 'step.blockedWell' : 'step.blockedPrison', {
        name: who(step.seat),
        at: step.at,
      })
    case 'rescue':
      return t('step.rescue', { name: who(step.seat), at: step.at, to: step.to })
    /* Three doors, three lines. Read off the step's own reason like `blocked`
       is, never off the square: 31 and 52 are the board's business. */
    case 'freed':
      return t(step.reason === 'well' ? 'step.freedWell' : 'step.freedPrison', {
        name: who(step.seat),
        waited: step.waited,
      })
    case 'escape':
      return t(step.reason === 'well' ? 'step.escapeWell' : 'step.escapePrison', {
        name: who(step.seat),
        face: step.dice[0] ?? 0,
      })
    case 'escapeFailed':
      return t(step.reason === 'well' ? 'step.escapeFailedWell' : 'step.escapeFailedPrison', {
        name: who(step.seat),
        a: step.dice[0] ?? 0,
        b: step.dice[1] ?? 0,
      })
    case 'skip':
      return t('step.skip', { name: who(step.seat), turns: step.turns })
    case 'double':
      return t('step.double', { name: who(step.seat), face: step.dice[0] ?? 0 })
    case 'tripleDouble':
      /* Read off the step, never off the config: the client is told what the
         third double did, it does not know the rule that decided it. */
      return t(step.outcome === 'restart' ? 'step.tripleRestart' : 'step.triplePass', {
        name: who(step.seat),
        from: step.from,
      })
    case 'deadlock':
      return t('step.deadlock')
    case 'win':
      return t('step.win', { name: who(step.seat), at: step.at })
  }
}

/* Only the LAST step of a chain is guaranteed to land on a legal square: a
   goose whose advance overshoots 63 carries the raw destination, 68 say, and
   the bounce after it does the correcting. Clamp what gets drawn. Returns
   null for a step that moves nobody, so the pawn stays put. */
export function landingOf(step: Step): Square | null {
  switch (step.kind) {
    case 'move':
    case 'opening9':
    case 'goose':
    case 'bounce':
    case 'overshoot':
    case 'bridge':
    case 'dice':
    case 'maze':
    case 'death':
      return clamp(step.to)
    case 'tripleDouble':
      /* 'pass' points back at the square the seat is already on, 'restart'
         points at 0. Either way the step says where the pawn ends up. */
      return clamp(step.to)
    case 'blocked':
    case 'rescue':
    case 'freed':
    case 'escape':
    case 'escapeFailed':
      /* `at` is where the seat that just rolled is standing; a rescue moves
         somebody else, and their new square comes with the next view. The
         three exits all name the square the trap is on, and the move step
         that follows an escape is what carries the pawn off it. */
      return clamp(step.at)
    case 'win':
      return clamp(step.at)
    case 'skip':
    case 'double':
    case 'deadlock':
      return null
  }
}

/* The square the chain started from, taken off the server's own first step.
   Null when no step names one, and the pawn then stays where the view put it. */
export function originOf(steps: Step[]): Square | null {
  const first = steps[0]
  if (!first || !('from' in first)) return null
  return clamp(first.from)
}

/* The steps that move a pawn somewhere it did not walk to. They are the ones
   worth flying along the spiral, and the list is a list of step kinds on
   purpose: the distance between two squares is not what makes a teleport, the
   rule that fired is, and only the engine knows that. */
export function flightOf(step: Step): { from: Square; to: Square } | null {
  switch (step.kind) {
    case 'opening9':
    case 'bridge':
    case 'dice':
    case 'maze':
    case 'death':
    case 'tripleDouble': {
      const from = clamp(step.from)
      const to = clamp(step.to)
      /* A third double that only passes the turn points at the square the seat
         is already on. Nothing to fly. */
      return from === to ? null : { from, to }
    }
    default:
      return null
  }
}

function clamp(square: number): Square {
  return Math.min(Math.max(square, 0), BOARD_SIZE)
}
