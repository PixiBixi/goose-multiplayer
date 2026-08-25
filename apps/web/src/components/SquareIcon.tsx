import type { JSX } from 'react'
import type { IconName } from '../lib/square-mark.js'

/* Ported from design/build.mjs: stroke-based, drawn on a 24px grid, one
   consistent weight. Inline SVG and never emoji: an emoji renders as a
   different picture on every platform and reads as a random glyph to a
   screen reader. */
const PATHS: Record<IconName, JSX.Element> = {
  goose: (
    <>
      <circle cx="16.4" cy="6.6" r="2.6" />
      <path d="M18.9 5.9h3.1l-1.6 1.9" />
      <path d="M15.4 9c-1.3 1.4-1.6 2.6-3.4 3.3C9.3 13.4 7 15.6 7 18.4V20" />
      <path d="M4 20h14" />
    </>
  ),
  bridge: (
    <>
      <path d="M2.5 17.5h19" />
      <path d="M4.5 17.5c0-4.7 3.4-7.8 7.5-7.8s7.5 3.1 7.5 7.8" />
      <path d="M8.5 17.5v-4.2M15.5 17.5v-4.2M12 17.5v-5.4" />
    </>
  ),
  inn: (
    <>
      <path d="M6 7.5h9.5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M15.5 10h2a2.6 2.6 0 0 1 0 5.2h-2" />
      <path d="M6 11h9.5" />
    </>
  ),
  well: (
    <>
      <path d="M3.5 8.5 12 3.2l8.5 5.3" />
      <path d="M7 9.6v3.1M17 9.6v3.1" />
      <path d="M5.6 12.7h12.8l-1.3 8H6.9z" />
      <path d="M12 12.7v3.4" />
    </>
  ),
  maze: <path d="M3.2 3.2h17.6v17.6H7.6V7.6h9.6v9.6h-5.6v-5.6h2.4" />,
  prison: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="2.2" />
      <path d="M9.2 3.8v16.4M14.8 3.8v16.4" />
    </>
  ),
  skull: (
    <>
      <path d="M12 2.8c-4.5 0-8 3.2-8 7.4 0 2.5 1.2 4.4 3 5.6v2.4a2.6 2.6 0 0 0 2.6 2.6h4.8a2.6 2.6 0 0 0 2.6-2.6v-2.4c1.8-1.2 3-3.1 3-5.6 0-4.2-3.5-7.4-8-7.4z" />
      <circle cx="8.9" cy="11" r="1.7" />
      <circle cx="15.1" cy="11" r="1.7" />
      <path d="M10.4 17.2v3.6M13.6 17.2v3.6" />
    </>
  ),
  dice: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4" />
      <circle cx="8.4" cy="8.4" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="15.6" cy="15.6" r="1.5" />
    </>
  ),
  garden: (
    <>
      <path d="M12 21v-5.4" />
      <path d="M12 15.6c-3.4 0-6-2.4-6-5.4S8.6 4.2 12 4.2s6 3 6 6-2.6 5.4-6 5.4z" />
      <path d="M9.4 10.8 12 8.4l2.6 2.4" />
    </>
  ),
}

/** Standalone icon, for the legend and the seat plates. */
export function SquareIcon({ name, size = 18 }: { name: IconName; size?: number }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

/** The same drawing placed inside a parent SVG, centred on (x, y). */
export function SquareIconAt(props: {
  name: IconName
  x: number
  y: number
  size: number
  colour: string
  strokeWidth?: number
}): JSX.Element {
  const { name, x, y, size, colour, strokeWidth = 1.9 } = props
  const scale = size / 24
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${scale})`}
      fill="none"
      stroke={colour}
      strokeWidth={(strokeWidth * 24) / size}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </g>
  )
}
