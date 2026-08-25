import type { JSX } from 'react'
import { t } from '../i18n/index.js'

/* Pip layout ported from design/build.mjs. A die is drawn, never spelled out:
   the number is in the aria-label for anyone who cannot see the face. */
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[30, 30]],
  2: [
    [16, 16],
    [44, 44],
  ],
  3: [
    [16, 16],
    [30, 30],
    [44, 44],
  ],
  4: [
    [16, 16],
    [44, 16],
    [16, 44],
    [44, 44],
  ],
  5: [
    [16, 16],
    [44, 16],
    [30, 30],
    [16, 44],
    [44, 44],
  ],
  6: [
    [16, 16],
    [44, 16],
    [16, 30],
    [44, 30],
    [16, 44],
    [44, 44],
  ],
}

/* idle: nothing has been rolled. rolling: the tumble, showing spun faces that
   are not the result. result: what the server actually rolled. */
export type DieState = 'idle' | 'rolling' | 'result'

export type DieProps = {
  /** Null in the idle state, where there is no face to draw at all. */
  value: number | null
  state?: DieState
  size?: number
}

/* An idle die shows no pips. Two printed faces sitting under a button that
   says "roll the dice" read as a result that already happened, and the player
   believes the turn is over before it started. */
export function Die({ value, state = 'result', size = 52 }: DieProps): JSX.Element {
  const pips = state === 'idle' || value === null ? [] : (PIPS[value] ?? [])
  const label =
    state === 'idle' ? t('die.idle') : state === 'rolling' ? t('die.rolling') : String(value)
  return (
    <svg
      className="die"
      data-state={state}
      viewBox="0 0 60 60"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      aria-busy={state === 'rolling' || undefined}
    >
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="57"
        fill="var(--paper-raised)"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeDasharray={state === 'idle' ? '7 5' : undefined}
      />
      {state === 'idle' ? (
        <text
          x="30"
          y="41"
          textAnchor="middle"
          fontFamily="var(--display)"
          fontSize="28"
          fill="var(--dim)"
        >
          ?
        </text>
      ) : null}
      {pips.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.6" fill="var(--ink)" />
      ))}
    </svg>
  )
}
