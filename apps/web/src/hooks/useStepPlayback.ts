import type { Square } from '@goose/engine'
import type { TableView } from '@goose/protocol'
import { useEffect, useState } from 'react'
import { landingOf } from '../lib/describe-step.js'

export type Playback = {
  /** The square the chain is standing on right now, already clamped. */
  square: Square | null
  index: number
  done: boolean
}

/* Every table view carries a fresh copy of lastTurn, so object identity says
   nothing: a chat message would restart the animation mid-chain. The content
   is the identity. */
export function turnSignature(lastTurn: TableView['lastTurn']): string {
  if (lastTurn === null) return ''
  return JSON.stringify([lastTurn.seat, lastTurn.dice, lastTurn.steps])
}

export function useStepPlayback(
  lastTurn: TableView['lastTurn'],
  opts: { stepMs: number },
): Playback {
  const steps = lastTurn?.steps ?? []
  const key = turnSignature(lastTurn)
  const [played, setPlayed] = useState({ key, index: 0 })

  /* Adjusting state while rendering, rather than in an effect: a new turn has
     to show its first step immediately, not one frame after the old chain's
     last square has already been painted. */
  if (played.key !== key) setPlayed({ key, index: 0 })
  const index = played.key === key ? played.index : 0
  const done = index >= steps.length - 1

  useEffect(() => {
    if (done) return
    const timer = setTimeout(() => {
      setPlayed((previous) =>
        previous.key === key ? { key, index: previous.index + 1 } : previous,
      )
    }, opts.stepMs)
    return () => {
      clearTimeout(timer)
    }
  }, [key, index, done, opts.stepMs])

  let square: Square | null = null
  for (let i = 0; i <= index && i < steps.length; i++) {
    const at = landingOf(steps[i]!)
    if (at !== null) square = at
  }

  return { square, index, done }
}
