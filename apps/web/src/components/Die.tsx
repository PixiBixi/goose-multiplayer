import type { JSX } from 'react'

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

export function Die({ value, size = 52 }: { value: number; size?: number }): JSX.Element {
  const pips = PIPS[value] ?? []
  return (
    <svg
      className="die"
      viewBox="0 0 60 60"
      width={size}
      height={size}
      role="img"
      aria-label={String(value)}
    >
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="57"
        fill="var(--paper-raised)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      {pips.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.6" fill="var(--ink)" />
      ))}
    </svg>
  )
}
