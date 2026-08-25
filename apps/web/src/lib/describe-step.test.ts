import { describe, expect, it } from 'vitest'
import { describeStep, landingOf, originOf } from './describe-step.js'

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

  it('says why the same seat is rolling again', () => {
    expect(describeStep({ kind: 'double', seat: 0, dice: [4, 4] }, names)).toMatch(
      /Double 4 : Jérémy rejoue/,
    )
  })

  it('reads the third double off the step, because it knows no rule', () => {
    const pass = describeStep(
      { kind: 'tripleDouble', seat: 1, outcome: 'pass', from: 20, to: 20 },
      names,
    )
    const restart = describeStep(
      { kind: 'tripleDouble', seat: 1, outcome: 'restart', from: 20, to: 0 },
      names,
    )
    expect(pass).toMatch(/le tour passe/i)
    expect(restart).toMatch(/repart du départ/i)
    expect(pass).toContain('Claire')
  })

  it('never emits an em dash', () => {
    const all = [
      describeStep({ kind: 'move', from: 1, to: 2, by: 1 }, names),
      describeStep({ kind: 'goose', from: 5, to: 7, by: 2 }, names),
      describeStep({ kind: 'bounce', from: 66, to: 60, overshoot: 3 }, names),
      describeStep({ kind: 'win', seat: 0, at: 63 }, names),
      describeStep({ kind: 'skip', seat: 1, turns: 1 }, names),
      describeStep({ kind: 'double', seat: 0, dice: [2, 2] }, names),
      describeStep({ kind: 'tripleDouble', seat: 0, outcome: 'pass', from: 9, to: 9 }, names),
      describeStep({ kind: 'tripleDouble', seat: 0, outcome: 'restart', from: 9, to: 0 }, names),
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
    expect(landingOf({ kind: 'double', seat: 0, dice: [5, 5] })).toBeNull()
  })

  it('walks the pawn home on a third double that restarts it', () => {
    expect(landingOf({ kind: 'tripleDouble', seat: 0, outcome: 'restart', from: 40, to: 0 })).toBe(
      0,
    )
    expect(landingOf({ kind: 'tripleDouble', seat: 0, outcome: 'pass', from: 40, to: 40 })).toBe(40)
  })
})

describe('originOf', () => {
  it('reads the square the chain starts from off the server first step', () => {
    expect(originOf([{ kind: 'move', from: 12, to: 18, by: 6 }])).toBe(12)
  })

  it('has nothing to say about an empty chain', () => {
    expect(originOf([])).toBeNull()
  })
})
