import type { Step } from '@goose/engine'
import { STEP_KINDS } from '@goose/protocol'
import { describe, expect, it } from 'vitest'
import { cardFor, cardsFor, ruleOf } from './rule-cards.js'

/* One step of every kind the wire carries. STEP_KINDS is the list the
   protocol keeps, so a rule added to the engine and forgotten here fails the
   count below rather than reaching a player as a card that says nothing. */
const ONE_OF_EACH: Record<(typeof STEP_KINDS)[number], Step> = {
  move: { kind: 'move', from: 1, to: 4, by: 3 },
  opening9: { kind: 'opening9', from: 0, to: 53, dice: [5, 4] },
  goose: { kind: 'goose', from: 5, to: 10, by: 5 },
  bridge: { kind: 'bridge', from: 6, to: 12 },
  dice: { kind: 'dice', from: 26, to: 53 },
  maze: { kind: 'maze', from: 42, to: 30 },
  death: { kind: 'death', from: 58, to: 1 },
  bounce: { kind: 'bounce', from: 66, to: 60, overshoot: 3 },
  overshoot: { kind: 'overshoot', from: 66, to: 63, overshoot: 3 },
  blocked: { kind: 'blocked', seat: 0, at: 31, reason: 'well' },
  rescue: { kind: 'rescue', seat: 1, at: 31, to: 20, reason: 'well' },
  freed: { kind: 'freed', seat: 0, at: 31, reason: 'well', waited: 3 },
  escape: { kind: 'escape', seat: 0, at: 52, reason: 'prison', dice: [4, 4] },
  escapeFailed: { kind: 'escapeFailed', seat: 0, at: 52, reason: 'prison', dice: [4, 2] },
  skip: { kind: 'skip', seat: 0, turns: 1 },
  double: { kind: 'double', seat: 0, dice: [4, 4] },
  tripleDouble: { kind: 'tripleDouble', seat: 0, outcome: 'restart', from: 20, to: 0 },
  deadlock: { kind: 'deadlock' },
  win: { kind: 'win', seat: 0, at: 63 },
}

describe('rule cards', () => {
  it('has a card for every rule the engine can name', () => {
    for (const kind of STEP_KINDS) {
      const step = ONE_OF_EACH[kind]
      /* The two steps that fire no rule: an ordinary advance, and a missed
         escape attempt. A card on either would train the table to stop
         reading them. */
      if (kind === 'move' || kind === 'escapeFailed') {
        expect(ruleOf(step), `${kind} is not a rule`).toBeNull()
        continue
      }
      const card = cardFor(step)
      expect(card, `no card for ${kind}`).not.toBeNull()
      expect(card?.name.length).toBeGreaterThan(0)
      expect(card?.why.length).toBeGreaterThan(0)
      /* The key itself coming back means the dictionary is missing it, and t()
         returns the key rather than throwing. */
      expect(card?.name).not.toContain('card.')
      expect(card?.why).not.toContain('card.')
    }
  })

  it('explains why the rule exists rather than repeating what it just did', () => {
    /* The whole reason for the card. "de la case 0 a la case 53" is what the
       turn log already says; the card is there to say why that rule is in the
       game at all. */
    const opening = cardFor(ONE_OF_EACH.opening9)
    expect(opening?.name).toBe("Le neuf d'ouverture")
    expect(opening?.why).toMatch(/sans cette r[eè]gle/i)
    expect(opening?.why).toMatch(/finie d'entr[eé]e/i)
  })

  it('never writes an em dash', () => {
    /* Escaped rather than typed: the character is banned from this repository,
       including from the assertion that keeps it out. */
    const emDash = '\u2014'
    for (const step of Object.values(ONE_OF_EACH)) {
      const card = cardFor(step)
      expect(card?.name ?? '').not.toContain(emDash)
      expect(card?.why ?? '').not.toContain(emDash)
    }
  })

  it('tells the well from the prison off the step, never off the square', () => {
    expect(ruleOf({ kind: 'blocked', seat: 0, at: 31, reason: 'well' })).toBe('well')
    expect(ruleOf({ kind: 'blocked', seat: 0, at: 52, reason: 'prison' })).toBe('prison')
    /* And the square in the step is not consulted: a reason that disagrees
       with the square still picks the rule the engine named. */
    expect(ruleOf({ kind: 'blocked', seat: 0, at: 52, reason: 'well' })).toBe('well')
  })

  it('wears the trap a rescue opened', () => {
    expect(cardFor({ kind: 'rescue', seat: 1, at: 31, to: 20, reason: 'well' })?.icon).toBe('well')
    expect(cardFor({ kind: 'rescue', seat: 1, at: 52, to: 20, reason: 'prison' })?.icon).toBe(
      'prison',
    )
  })

  it('wears the trap the served sentence opened', () => {
    expect(cardFor({ kind: 'freed', seat: 0, at: 52, reason: 'prison', waited: 3 })?.icon).toBe(
      'prison',
    )
    expect(cardFor({ kind: 'freed', seat: 0, at: 31, reason: 'well', waited: 3 })?.icon).toBe(
      'well',
    )
  })

  it('gives the three exits three different cards', () => {
    /* Replaced, let go, or out on your own double: three rules, and a player
       who is told the wrong one has been told nothing. */
    expect(ruleOf(ONE_OF_EACH.rescue)).toBe('rescue')
    expect(ruleOf(ONE_OF_EACH.freed)).toBe('freed')
    expect(ruleOf(ONE_OF_EACH.escape)).toBe('escape')
  })

  it('says that the escaping double hands back no extra roll', () => {
    /* It reads like a bug otherwise: every other double at this table gives
       the seat another go. */
    expect(cardFor(ONE_OF_EACH.escape)?.why).toMatch(/ne redonne pas la main/i)
  })

  it('queues one card per rule, not one per step', () => {
    /* A seven goose chain is one goose rule. The second card would say word
       for word what the first one said, and the table would sit through it. */
    const chain: Step[] = [
      { kind: 'move', from: 0, to: 5, by: 5 },
      { kind: 'goose', from: 5, to: 10, by: 5 },
      { kind: 'goose', from: 10, to: 15, by: 5 },
      { kind: 'goose', from: 15, to: 20, by: 5 },
    ]
    expect(cardsFor(chain).map((card) => card.id)).toEqual(['goose'])
  })

  it('keeps the order the rules fired in', () => {
    const chain: Step[] = [
      { kind: 'move', from: 0, to: 5, by: 5 },
      { kind: 'goose', from: 5, to: 10, by: 5 },
      { kind: 'move', from: 10, to: 10, by: 0 },
      { kind: 'blocked', seat: 0, at: 31, reason: 'prison' },
      { kind: 'double', seat: 0, dice: [3, 3] },
    ]
    expect(cardsFor(chain).map((card) => card.id)).toEqual(['goose', 'prison', 'double'])
  })

  it('shows nothing for a turn that fired no rule at all', () => {
    expect(cardsFor([{ kind: 'move', from: 1, to: 4, by: 3 }])).toEqual([])
  })

  /* The wire is a version boundary: a tab loaded before a deploy is handed
     kinds its own bundle has never heard of. The switch used to fall through
     and return undefined, and the LOOK lookup that followed took the whole
     page down. */
  describe('a step from a newer server', () => {
    /* Cast because the whole point is that the type system cannot see it: this
       is a rule that did not exist when this bundle was built. */
    const unknownStep = { kind: 'quarantine', seat: 0, at: 7, to: 9 } as unknown as Step
    const unknownReason = {
      kind: 'blocked',
      seat: 0,
      at: 31,
      reason: 'quarantine',
    } as unknown as Step

    it('names no rule rather than falling off the end of the switch', () => {
      expect(ruleOf(unknownStep)).toBeNull()
    })

    it('makes no card, and above all does not throw looking one up', () => {
      expect(() => cardFor(unknownStep)).not.toThrow()
      expect(cardFor(unknownStep)).toBeNull()
    })

    it('skips it in the queue and keeps the rules around it', () => {
      const chain = [
        { kind: 'move', from: 0, to: 5, by: 5 } as Step,
        unknownStep,
        { kind: 'goose', from: 5, to: 10, by: 5 } as Step,
      ]
      expect(cardsFor(chain).map((card) => card.id)).toEqual(['goose'])
    })

    it('says nothing about a trap it cannot name', () => {
      /* Rather than calling it a prison because that is the other side of a
         ternary: a player told the wrong rule has been told nothing. */
      expect(ruleOf(unknownReason)).toBeNull()
      expect(cardFor(unknownReason)).toBeNull()
    })
  })
})
