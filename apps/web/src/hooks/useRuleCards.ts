import type { Step } from '@goose/engine'
import { useEffect, useMemo, useState } from 'react'
import { cardsFor, type RuleCardContent } from '../lib/rule-cards.js'

export type RuleCardQueue = {
  /** The card on screen right now, or null when the queue is empty. */
  current: RuleCardContent | null
  /** True while the queue still owes the table something on a timer. */
  holds: boolean
  /** Drop the current card and show the next one, if there is one. */
  dismiss: () => void
}

export type RuleCardOptions = {
  dwellMs: number
  reduced?: boolean
}

/* One card at a time, in the order the rules fired. Never a stack: two cards
   at once is two things asking to be read, and the second one wins by being
   closer to the eye rather than by being the rule that mattered.

   `holds` is what keeps the roll button down while a card is up, so a turn is
   not overtaken by the next one. Under reduced motion nothing runs on a
   timer, so nothing is held: the card waits to be clicked away instead of
   putting a three second deadline on reading it. */
export function useRuleCards(
  signature: string,
  steps: Step[],
  revealed: number,
  opts: RuleCardOptions,
): RuleCardQueue {
  const reduced = opts.reduced ?? false
  /* Keyed on the turn and on how much of it has played. The steps array is a
     fresh object inside every view the server sends, so it says nothing. */
  const queue = useMemo(() => cardsFor(steps.slice(0, revealed)), [signature, revealed])
  const [shown, setShown] = useState({ key: signature, index: 0 })

  /* Adjusted while rendering rather than in an effect: a new turn must not
     paint one frame of the previous turn's card under the new chain. */
  if (shown.key !== signature) setShown({ key: signature, index: 0 })
  const index = shown.key === signature ? shown.index : 0
  const current = queue[index] ?? null
  const waiting = current !== null

  const dismiss = (): void => {
    setShown((previous) =>
      previous.key === signature ? { key: signature, index: previous.index + 1 } : previous,
    )
  }

  /* `waiting` and not the queue length: a card that arrives behind the one on
     screen must not restart the dwell of the one being read. */
  useEffect(() => {
    if (reduced || !waiting) return
    const timer = setTimeout(dismiss, opts.dwellMs)
    return () => {
      clearTimeout(timer)
    }
  }, [signature, index, waiting, reduced, opts.dwellMs])

  return { current, holds: !reduced && waiting, dismiss }
}
