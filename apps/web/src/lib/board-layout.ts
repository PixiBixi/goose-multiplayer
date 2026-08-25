import { BOARD_SIZE } from '@goose/engine'

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
