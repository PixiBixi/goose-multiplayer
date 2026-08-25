import { describe, expect, it } from 'vitest'
import { describeStep, landingOf } from './describe-step.js'

const names = ['Jérémy', 'Claire']

describe('describeStep', () => {
  it('narrates a plain move', () => {
    expect(describeStep({ kind: 'move', from: 2, to: 9, by: 7 }, names)).toContain('9')
  })

  it('names the square that fired', () => {
    expect(describeStep({ kind: 'bridge', from: 6, to: 12 }, names)).toMatch(/pont/i)
    expect(describeStep({ kind: 'death', from: 58, to: 1 }, names)).toMatch(/mort/i)
    expect(describeStep({ kind: 'maze', from: 42, to: 30 }, names)).toMatch(/labyrinthe/i)
  })

  it('names the seat a rescue frees', () => {
    expect(describeStep({ kind: 'rescue', seat: 1, at: 31, to: 20 }, names)).toContain('Claire')
  })

  it('tells the well and the prison apart', () => {
    expect(describeStep({ kind: 'blocked', seat: 0, at: 31, reason: 'well' }, names)).toMatch(
      /puits/i,
    )
    expect(describeStep({ kind: 'blocked', seat: 0, at: 52, reason: 'prison' }, names)).toMatch(
      /prison/i,
    )
  })

  it('never emits an em dash', () => {
    const all = [
      describeStep({ kind: 'move', from: 1, to: 2, by: 1 }, names),
      describeStep({ kind: 'goose', from: 5, to: 7, by: 2 }, names),
      describeStep({ kind: 'bounce', from: 66, to: 60, overshoot: 3 }, names),
      describeStep({ kind: 'win', seat: 0, at: 63 }, names),
      describeStep({ kind: 'skip', seat: 1, turns: 1 }, names),
    ]
    for (const line of all) expect(line).not.toContain('—')
  })
})

describe('landingOf', () => {
  it('clamps a goose that overshoots, because only the last step is legal', () => {
    // A goose advance carries the raw destination, 68 here, and the bounce
    // that follows corrects it. Rendering 68 would fall off the board.
    expect(landingOf({ kind: 'goose', from: 59, to: 68, by: 9 })).toBe(63)
  })

  it('follows the pawn onto the square a trap holds it on', () => {
    expect(landingOf({ kind: 'blocked', seat: 0, at: 31, reason: 'well' })).toBe(31)
    expect(landingOf({ kind: 'rescue', seat: 1, at: 31, to: 4 })).toBe(31)
    expect(landingOf({ kind: 'win', seat: 0, at: 63 })).toBe(63)
  })

  it('leaves the pawn where it stands when nothing moves it', () => {
    expect(landingOf({ kind: 'skip', seat: 0, turns: 1 })).toBeNull()
  })
})
