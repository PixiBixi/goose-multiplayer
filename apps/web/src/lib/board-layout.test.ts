import { describe, expect, it } from 'vitest'
import {
  gridCells,
  pathSquares,
  pointAlong,
  polylineLength,
  polylinePath,
  spiralPoints,
} from './board-layout.js'

describe('spiralPoints', () => {
  const pts = spiralPoints({ size: 600, cellRadius: 25 })

  it('lays out the sixty-two squares that are not the garden', () => {
    expect(pts).toHaveLength(62)
    expect(pts.map((p) => p.n)).toEqual(Array.from({ length: 62 }, (_, i) => i + 1))
  })

  it('keeps every square inside the viewport', () => {
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(25)
      expect(p.x).toBeLessThanOrEqual(575)
      expect(p.y).toBeGreaterThanOrEqual(25)
      expect(p.y).toBeLessThanOrEqual(575)
    }
  })

  it('winds inward without ever going back out', () => {
    const radius = (p: { x: number; y: number }) => Math.hypot(p.x - 300, p.y - 300)
    for (let i = 1; i < pts.length; i++) {
      expect(radius(pts[i]!)).toBeLessThanOrEqual(radius(pts[i - 1]!) + 0.001)
    }
  })

  it('never overlaps two consecutive squares', () => {
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y)
      expect(d).toBeGreaterThan(2 * 25 * 0.9)
    }
  })

  it('leaves room at the centre for the garden medallion', () => {
    const last = pts.at(-1)!
    expect(Math.hypot(last.x - 300, last.y - 300)).toBeGreaterThan(60)
  })

  it('enters at the bottom, as on the historic sheets', () => {
    const first = pts[0]!
    expect(first.x).toBeCloseTo(300, 6)
    expect(first.y).toBeGreaterThan(300)
  })
})

describe('gridCells', () => {
  const cells = gridCells({ cols: 7, cell: 46, gap: 5 })

  it('lays out all sixty-three squares', () => {
    expect(cells).toHaveLength(63)
  })

  it('starts at the bottom left and snakes upward', () => {
    const one = cells.find((c) => c.n === 1)!
    const eight = cells.find((c) => c.n === 8)!
    const seven = cells.find((c) => c.n === 7)!
    expect(one.x).toBeLessThan(seven.x)
    expect(eight.y).toBeLessThan(one.y)
    expect(eight.x).toBe(seven.x)
  })

  it('never lets two squares share a slot', () => {
    const slots = new Set(cells.map((c) => `${c.x}:${c.y}`))
    expect(slots.size).toBe(63)
  })
})

describe('the route a flight follows', () => {
  it('walks every square between the two ends, ends included', () => {
    expect(pathSquares(6, 12)).toEqual([6, 7, 8, 9, 10, 11, 12])
    expect(pathSquares(0, 3)).toEqual([0, 1, 2, 3])
    expect(pathSquares(9, 9)).toEqual([9])
  })

  it('runs backwards for a rule that sends the pawn back', () => {
    // La Mort, 58 to 1: the pawn retraces the spiral rather than cutting
    // across the middle of the board on a straight line.
    expect(pathSquares(58, 55)).toEqual([58, 57, 56, 55])
    expect(pathSquares(0, 53)).toHaveLength(54)
  })

  it('crosses the same squares on the grid as on the spiral', () => {
    /* Both renderers walk this same list and look each square up in their own
       geometry, so the boustrophedon follows its rows and the spiral follows
       its arcs without either one owning a second copy of the route. */
    const cells = gridCells({ cols: 7, cell: 46, gap: 5 })
    const route = pathSquares(1, 9).map((n) => cells[n - 1])
    expect(route.every((cell) => cell !== undefined)).toBe(true)
    expect(route.at(-1)?.n).toBe(9)
  })

  it('measures a polyline end to end', () => {
    expect(polylineLength([{ x: 0, y: 0 }])).toBe(0)
    expect(
      polylineLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 14 },
      ]),
    ).toBe(15)
  })

  it('writes a path command per point', () => {
    expect(
      polylinePath([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toBe('M1.0,2.0 L3.0,4.0')
  })

  it('samples by distance, not by vertex', () => {
    /* The start strip sits far below square 1 while the squares are evenly
       spaced. Counting vertices would make the pawn crawl across that one hop
       and sprint the rest. */
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 110, y: 0 },
    ]
    expect(pointAlong(line, 0)).toEqual({ x: 0, y: 0 })
    expect(pointAlong(line, 0.5).x).toBeCloseTo(55, 6)
    expect(pointAlong(line, 1)).toEqual({ x: 110, y: 0 })
  })

  it('stays on the path for a fraction outside zero and one', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    expect(pointAlong(line, -3)).toEqual({ x: 0, y: 0 })
    expect(pointAlong(line, 9)).toEqual({ x: 10, y: 0 })
    expect(pointAlong([], 0.5)).toEqual({ x: 0, y: 0 })
  })
})
