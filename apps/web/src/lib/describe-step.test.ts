import { describe, expect, it } from 'vitest'
import { describeStep, flightOf, landingOf, originOf } from './describe-step.js'

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
    expect(
      describeStep({ kind: 'rescue', seat: 1, at: 31, to: 20, reason: 'well' }, names),
    ).toContain('Claire')
  })

  it('gives the three exits three different lines', () => {
    const freed = describeStep(
      { kind: 'freed', seat: 1, at: 52, reason: 'prison', waited: 3 },
      names,
    )
    expect(freed).toContain('Claire')
    expect(freed).toMatch(/prison/i)
    expect(freed).toContain('3')

    const escape = describeStep(
      { kind: 'escape', seat: 0, at: 31, reason: 'well', dice: [4, 4] },
      names,
    )
    expect(escape).toMatch(/double/i)
    expect(escape).toMatch(/puits/i)

    const missed = describeStep(
      { kind: 'escapeFailed', seat: 0, at: 31, reason: 'well', dice: [4, 2] },
      names,
    )
    /* A miss has to be visible, or the turn reads as if the seat had simply
       been skipped and the player never sees that it played. */
    expect(missed).toMatch(/rat[ée]/i)
    expect(missed).toContain('Jérémy')
  })

  it('tells the well and the prison apart', () => {
    expect(describeStep({ kind: 'blocked', seat: 0, at: 31, reason: 'well' }, names)).toMatch(
      /puits/i,
    )
    expect(describeStep({ kind: 'blocked', seat: 0, at: 52, reason: 'prison' }, names)).toMatch(
      /prison/i,
    )
  })

  it('names the opening nine off its own step, dice included', () => {
    /* The defect this whole file exists to close: the engine used to emit an
       ordinary move, so the line read "de la case 0 a la case 53" and the rule
       that fired had no name anywhere on screen. */
    const line = describeStep({ kind: 'opening9', from: 0, to: 53, dice: [5, 4] }, names)
    expect(line).toMatch(/neuf d'ouverture/i)
    expect(line).toContain('53')
    expect(line).toContain('5')
    expect(line).toContain('4')
  })

  it('tells a dropped surplus from a rebound', () => {
    const bounce = describeStep({ kind: 'bounce', from: 66, to: 60, overshoot: 3 }, names)
    const over = describeStep({ kind: 'overshoot', from: 66, to: 63, overshoot: 3 }, names)
    expect(bounce).toMatch(/rebond/i)
    expect(over).toMatch(/jardin/i)
    expect(over).not.toBe(bounce)
  })

  it('says out loud that a round ended with nobody able to play', () => {
    expect(describeStep({ kind: 'deadlock' }, names)).toMatch(/sans vainqueur/i)
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
      describeStep({ kind: 'opening9', from: 0, to: 26, dice: [6, 3] }, names),
      describeStep({ kind: 'overshoot', from: 66, to: 63, overshoot: 3 }, names),
      describeStep({ kind: 'deadlock' }, names),
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
    expect(landingOf({ kind: 'rescue', seat: 1, at: 31, to: 4, reason: 'well' })).toBe(31)
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

describe('flightOf', () => {
  it('flies the steps the engine named as teleports, whatever the distance', () => {
    expect(flightOf({ kind: 'opening9', from: 0, to: 53, dice: [5, 4] })).toEqual({
      from: 0,
      to: 53,
    })
    expect(flightOf({ kind: 'bridge', from: 6, to: 12 })).toEqual({ from: 6, to: 12 })
    expect(flightOf({ kind: 'dice', from: 26, to: 53 })).toEqual({ from: 26, to: 53 })
    expect(flightOf({ kind: 'maze', from: 42, to: 30 })).toEqual({ from: 42, to: 30 })
    expect(flightOf({ kind: 'death', from: 58, to: 1 })).toEqual({ from: 58, to: 1 })
  })

  it('leaves an ordinary advance to walk, however far it goes', () => {
    /* Distance is not what makes a flight. A twelve square roll is a walk and
       a six square bridge is a teleport, and only the engine knows which. */
    expect(flightOf({ kind: 'move', from: 0, to: 12, by: 12 })).toBeNull()
    expect(flightOf({ kind: 'goose', from: 5, to: 14, by: 9 })).toBeNull()
    expect(flightOf({ kind: 'bounce', from: 66, to: 60, overshoot: 3 })).toBeNull()
  })

  it('does not fly a third double that only passes the turn', () => {
    expect(
      flightOf({ kind: 'tripleDouble', seat: 0, outcome: 'pass', from: 20, to: 20 }),
    ).toBeNull()
    expect(
      flightOf({ kind: 'tripleDouble', seat: 0, outcome: 'restart', from: 20, to: 0 }),
    ).toEqual({ from: 20, to: 0 })
  })
})
