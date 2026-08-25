import { useEffect, useState } from 'react'

export type DiceTumble = {
  /** The faces to draw right now: the spin while it tumbles, the truth after. */
  faces: number[]
  /** False while the tumble is running, so nothing downstream may start. */
  settled: boolean
}

export type DiceTumbleOptions = {
  tumbleMs: number
  frameMs: number
  reduced: boolean
}

/* A spin, not a rule, and deterministic on purpose: Math.random() in a render
   body paints two different frames from the same state, and a tumble nobody
   can reproduce is a tumble nobody can test. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  }
  return h >>> 0
}

function spin(seed: number, tick: number, index: number): number {
  const mixed = Math.imul(seed ^ (tick * 0x9e3779b1 + index * 0x85ebca6b), 0xc2b2ae35)
  return 1 + ((mixed >>> 11) % 6)
}

/* The server already knows the roll, and the point of this hook is that the
   client does not show it. While the tumble runs, `faces` carries spun values
   and never the real ones: a screenshot taken mid-animation gives the answer
   away otherwise, and holding the truth back is the only way to stop it. */
export function useDiceTumble(
  key: string,
  values: number[] | null,
  opts: DiceTumbleOptions,
): DiceTumble {
  const { tumbleMs, frameMs, reduced } = opts
  const immediate = reduced || values === null
  const [spun, setSpun] = useState({ key, tick: 0, settled: immediate })

  /* Adjusted while rendering rather than in an effect: a roll has to start
     hidden on the very frame it arrives, not one paint later, or the real
     faces are readable for that paint. */
  if (spun.key !== key) setSpun({ key, tick: 0, settled: immediate })
  const state = spun.key === key ? spun : { key, tick: 0, settled: immediate }
  const settled = state.settled || immediate

  /* Two timers rather than a chain of one: the spin and the settle are two
     different questions, and a chain that re-arms itself from a React effect
     only advances one frame per flush. */
  useEffect(() => {
    if (settled) return
    const landing = setTimeout(() => {
      setSpun((previous) => (previous.key === key ? { ...previous, settled: true } : previous))
    }, tumbleMs)
    return () => {
      clearTimeout(landing)
    }
  }, [key, settled, tumbleMs])

  useEffect(() => {
    if (settled) return
    const spinner = setInterval(() => {
      setSpun((previous) =>
        previous.key === key ? { ...previous, tick: previous.tick + 1 } : previous,
      )
    }, frameMs)
    return () => {
      clearInterval(spinner)
    }
  }, [key, settled, frameMs])

  if (values === null) return { faces: [], settled: true }
  if (settled) return { faces: values, settled: true }
  const seed = hash(key)
  return { faces: values.map((_, index) => spin(seed, state.tick, index)), settled: false }
}
