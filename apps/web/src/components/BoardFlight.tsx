import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Coords } from '../lib/board-layout.js'
import { pointAlong, polylineLength, polylinePath } from '../lib/board-layout.js'

export type BoardFlightProps = {
  /** The route, square centre by square centre, in the renderer's own units. */
  points: Coords[]
  colour: string
  initial: string
  radius: number
  durationMs: number
  label: string
}

/* Driven frame by frame here rather than by SMIL or by a CSS motion path.
   Both of those are lovely and neither is dependable across the two
   renderers: an <animateMotion> inserted into a document whose SVG timeline
   started minutes ago begins in the past and lands frozen at the end, and
   offset-path on an SVG group is exactly the corner of the spec browsers
   disagree about. This component owns its own clock, and only this component
   re-renders while it runs. */
function useFlightProgress(durationMs: number): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const started = performance.now()
    const tick = (now: number): void => {
      const linear = durationMs <= 0 ? 1 : Math.min(1, (now - started) / durationMs)
      setProgress(linear)
      if (linear < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [durationMs])

  return progress
}

/* Fast out of the gate, settling into the destination. A constant speed reads
   as a slide; this reads as a throw, which is what a jump of fifty three
   squares is. */
function ease(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t)
}

export function BoardFlight(props: BoardFlightProps): JSX.Element | null {
  const { points, colour, initial, radius, durationMs, label } = props
  const progress = useFlightProgress(durationMs)

  const route = useMemo(
    () => ({ d: polylinePath(points), length: polylineLength(points) }),
    [points],
  )
  if (points.length < 2 || route.length === 0) return null

  const travelled = ease(progress)
  const drawn = route.length * travelled
  /* A tail of its own length rather than the whole route lit up: the trail is
     what the pawn has just left behind, not a map of where it has been. */
  const tail = Math.min(drawn, route.length * 0.38)
  const at = pointAlong(points, travelled)
  /* Heavier in the air, back to size on arrival. */
  const scale = 1 + 0.22 * Math.sin(Math.PI * progress)

  return (
    <g className="board-flight" data-testid="board-flight" aria-hidden="true">
      {/* The route, faint, so the size of the jump is legible even once the
          comet has passed. */}
      <path
        d={route.d}
        fill="none"
        stroke={colour}
        strokeWidth={radius * 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.16 * (1 - progress * 0.6)}
      />
      <path
        d={route.d}
        fill="none"
        stroke={colour}
        strokeWidth={radius * 0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${tail.toFixed(1)} ${route.length.toFixed(1)}`}
        strokeDashoffset={(-(drawn - tail)).toFixed(1)}
        opacity={0.55}
      />
      <g transform={`translate(${at.x.toFixed(1)}, ${at.y.toFixed(1)}) scale(${scale.toFixed(3)})`}>
        <title>{label}</title>
        <circle r={radius} fill={colour} stroke="var(--ink)" strokeWidth={2} />
        <text
          y={radius * 0.36}
          textAnchor="middle"
          fontFamily="var(--display)"
          fontSize={radius * 0.96}
          fill="var(--paper-raised)"
        >
          {initial}
        </text>
      </g>
    </g>
  )
}
