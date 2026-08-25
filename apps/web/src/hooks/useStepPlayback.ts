import type { Square } from '@goose/engine'
import type { TableView } from '@goose/protocol'
import { useEffect, useState } from 'react'
import { landingOf, originOf } from '../lib/describe-step.js'

export type Playback = {
  /** The square the chain is standing on right now, already clamped. */
  square: Square | null
  /** How many steps have played. Zero while the dice are still tumbling. */
  played: number
  done: boolean
}

export type PlaybackOptions = {
  stepMs: number
  /** False holds the chain at its origin: the dice have not settled yet. */
  enabled?: boolean
  reduced?: boolean
}

/* Every table view carries a fresh copy of lastTurn, so object identity says
   nothing: a chat message would restart the animation mid-chain. The content
   is the identity. */
export function turnSignature(lastTurn: TableView['lastTurn']): string {
  if (lastTurn === null) return ''
  return JSON.stringify([lastTurn.seat, lastTurn.dice, lastTurn.steps])
}

export function useStepPlayback(lastTurn: TableView['lastTurn'], opts: PlaybackOptions): Playback {
  const steps = lastTurn?.steps ?? []
  const key = turnSignature(lastTurn)
  const enabled = opts.enabled ?? true
  const reduced = opts.reduced ?? false
  const [walked, setWalked] = useState({ key, played: 0 })

  /* Adjusting state while rendering, rather than in an effect: a new turn has
     to show its first step immediately, not one frame after the old chain's
     last square has already been painted. */
  if (walked.key !== key) setWalked({ key, played: 0 })
  const stored = walked.key === key ? walked.played : 0

  /* Reduced motion is not a slower walk, it is no walk: the pawn is already
     where the server put it and the whole chain is readable at once. */
  const counter =
    steps.length === 0 ? 0 : reduced ? steps.length + 1 : enabled ? Math.max(stored, 1) : 0
  const played = Math.min(counter, steps.length)
  /* One tick past the last step, on purpose: the line that closes a turn gets
     its own moment on screen before the roll button comes back. */
  const done = steps.length === 0 || counter > steps.length

  useEffect(() => {
    if (!enabled || reduced || done) return
    const timer = setTimeout(() => {
      setWalked((previous) =>
        previous.key === key ? { key, played: Math.max(previous.played, 1) + 1 } : previous,
      )
    }, opts.stepMs)
    return () => {
      clearTimeout(timer)
    }
  }, [key, played, done, enabled, reduced, opts.stepMs])

  /* Before the first step has played, the pawn stands where the chain started.
     That square is the server's own `from`, not a position worked out here. */
  let square: Square | null = originOf(steps)
  for (let i = 0; i < played && i < steps.length; i++) {
    const at = landingOf(steps[i]!)
    if (at !== null) square = at
  }

  return { square, played, done }
}
