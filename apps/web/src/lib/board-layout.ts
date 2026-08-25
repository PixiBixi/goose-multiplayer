import { BOARD_SIZE } from '@goose/engine'
import type { Square } from '@goose/engine'

/** The board switches renderer below this many pixels of container width. */
export const BOARD_GRID_BREAKPOINT = 700

export type Point = { n: number; x: number; y: number }
/** `theta` and `radius` are kept so a renderer can orient a square on its arc. */
export type SpiralPoint = Point & { theta: number; radius: number }
export type GridCell = Point & { w: number; h: number }

/* Ported from design/build.mjs, which is the geometry already validated on
   the design canvas. Sixty-two squares wind inward over roughly three turns;
   square 63, le Jardin, is the medallion at the centre and is NOT on the
   spiral. Arc spacing and radial pitch are kept equal so the band reads
   evenly instead of stretching on the outer turn. Do NOT re-derive these
   constants: the ratios are what keep consecutive squares from touching. */
const PITCH_RATIO = 0.0906
const START_THETA = Math.PI / 2
/** Breathing room between the outermost square and the viewport edge. */
const MARGIN = 6

export function spiralPoints(opts: { size: number; cellRadius: number }): SpiralPoint[] {
  const { size, cellRadius } = opts
  const cx = size / 2
  const cy = size / 2
  const pitch = size * PITCH_RATIO
  const step = pitch

  const points: SpiralPoint[] = []
  let radius = size / 2 - cellRadius - MARGIN
  let theta = START_THETA

  for (let i = 0; i < BOARD_SIZE - 1; i++) {
    points.push({
      n: i + 1,
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta),
      theta,
      radius,
    })
    const dTheta = step / radius
    theta -= dTheta // counter-clockwise
    radius -= (pitch / (2 * Math.PI)) * dTheta
  }
  return points
}

/* The boustrophedon fallback for a narrow container. Square 1 sits bottom
   left, the row above runs the other way, and so on: the same reading order
   as the spiral, only unrolled. */
export function gridCells(opts: { cols: number; cell: number; gap: number }): GridCell[] {
  const { cols, cell, gap } = opts
  const pitch = cell + gap
  const rows = Math.ceil(BOARD_SIZE / cols)

  return Array.from({ length: BOARD_SIZE }, (_, i) => {
    const n = i + 1
    const row = Math.floor(i / cols)
    const inRow = i % cols
    const column = row % 2 === 0 ? inRow : cols - 1 - inRow
    return {
      n,
      x: column * pitch,
      y: (rows - 1 - row) * pitch,
      w: cell,
      h: cell,
    }
  })
}

export function gridSize(opts: { cols: number; cell: number; gap: number }): {
  width: number
  height: number
} {
  const { cols, cell, gap } = opts
  const rows = Math.ceil(BOARD_SIZE / cols)
  return { width: cols * cell + (cols - 1) * gap, height: rows * cell + (rows - 1) * gap }
}

/** A bare position in a renderer's own units. Squares carry a number, a point
    on a flight path does not. */
export type Coords = { x: number; y: number }

/* The squares a pawn crosses on its way from one to the other, ends included.
   Both renderers walk the same list and turn each square into a centre of
   their own, so a flight follows the printed track rather than cutting across
   the board on a straight line. Square 0 is in the range: the start strip is
   where a pawn that has not entered yet stands, and the opening nine leaves
   from there. */
export function pathSquares(from: Square, to: Square): Square[] {
  const step = to >= from ? 1 : -1
  const length = Math.abs(to - from) + 1
  return Array.from({ length }, (_, i) => from + i * step)
}

/** The length of a polyline. Feeds the dash that draws a trail, so nothing
    has to measure the DOM to know how long the route is. */
export function polylineLength(points: Coords[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return total
}

/** An SVG path command string through the given points. */
export function polylinePath(points: Coords[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/* A point a fraction of the way along a polyline, measured in distance and
   not in vertices: the squares are evenly spaced but the start strip is not,
   and counting vertices would make the pawn crawl across that one hop. */
export function pointAlong(points: Coords[], t: number): Coords {
  const first = points[0]
  if (!first) return { x: 0, y: 0 }
  const target = polylineLength(points) * Math.min(Math.max(t, 0), 1)
  let walked = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    const span = Math.hypot(b.x - a.x, b.y - a.y)
    if (span === 0) continue
    if (walked + span >= target) {
      const k = (target - walked) / span
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
    walked += span
  }
  return points.at(-1) ?? first
}
