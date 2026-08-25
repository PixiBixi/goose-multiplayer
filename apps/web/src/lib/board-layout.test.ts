import { describe, expect, it } from 'vitest'
import { gridCells, spiralPoints } from './board-layout.js'

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
