import { describe, expect, it } from 'vitest'
import { clientSchemas } from './schemas.js'

describe('client schemas', () => {
  it('accepts a well-formed join', () => {
    const r = clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: 'Claire', session: 'tok' })
    expect(r.success).toBe(true)
  })

  it('upper-cases and trims the room code', () => {
    const r = clientSchemas.joinRoom.parse({ code: ' hkd4p2 ', name: 'Claire', session: 'tok' })
    expect(r.code).toBe('HKD4P2')
  })

  it('rejects a name that is empty or too long', () => {
    const join = (name: string) =>
      clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name, session: 'tok' }).success
    expect(join('')).toBe(false)
    expect(join('x'.repeat(25))).toBe(false)
  })

  it('demands a session token on both ways of sitting down', () => {
    // Without it the server cannot tell a returning player from a stranger,
    // so a dropped seat burns the whole grace period and is lost.
    expect(clientSchemas.createRoom.safeParse({ name: 'Claire' }).success).toBe(false)
    expect(clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: 'Claire' }).success).toBe(false)
  })

  it('rejects a session token that is empty or longer than the cap', () => {
    const create = (session: string) =>
      clientSchemas.createRoom.safeParse({ name: 'Claire', session }).success
    expect(create('')).toBe(false)
    expect(create('   ')).toBe(false)
    expect(create('x'.repeat(64))).toBe(true)
    expect(create('x'.repeat(65))).toBe(false)
  })

  it('rejects a chat message that is empty or too long', () => {
    expect(clientSchemas.chat.safeParse({ text: '' }).success).toBe(false)
    expect(clientSchemas.chat.safeParse({ text: 'x'.repeat(501) }).success).toBe(false)
    expect(clientSchemas.chat.safeParse({ text: 'salut' }).success).toBe(true)
  })

  it('rejects an unknown table rule', () => {
    expect(clientSchemas.configureTable.safeParse({ nope: true }).success).toBe(false)
  })

  it('accepts a partial table configuration', () => {
    expect(clientSchemas.configureTable.safeParse({ twoDice: false }).success).toBe(true)
  })

  it('carries the doubles house rule and what a third double costs', () => {
    expect(clientSchemas.configureTable.safeParse({ doubleAgain: false }).success).toBe(true)
    expect(clientSchemas.configureTable.safeParse({ tripleDouble: 'restart' }).success).toBe(true)
    expect(clientSchemas.configureTable.safeParse({ tripleDouble: 'pass' }).success).toBe(true)
    /* Only the two the engine knows: a third value would reach the reducer as
       an outcome nothing implements. */
    expect(clientSchemas.configureTable.safeParse({ tripleDouble: 'jail' }).success).toBe(false)
  })

  it('carries the two ways out of the well and the prison', () => {
    expect(clientSchemas.configureTable.safeParse({ escapeOnDouble: false }).success).toBe(true)
    expect(clientSchemas.configureTable.safeParse({ maxBlockedTurns: 3 }).success).toBe(true)
    /* null is a real choice, the historic rescue only table, and it has to
       survive the wire as itself rather than as a missing key. */
    const historic = clientSchemas.configureTable.safeParse({ maxBlockedTurns: null })
    expect(historic.success).toBe(true)
    expect(historic.data?.maxBlockedTurns).toBeNull()
  })

  it('refuses a cap nobody could play with', () => {
    expect(clientSchemas.configureTable.safeParse({ maxBlockedTurns: 0 }).success).toBe(false)
    expect(clientSchemas.configureTable.safeParse({ maxBlockedTurns: 2.5 }).success).toBe(false)
    expect(clientSchemas.configureTable.safeParse({ maxBlockedTurns: 99 }).success).toBe(false)
  })

  it('rejects a card mode that v1 cannot run', () => {
    expect(clientSchemas.configureTable.safeParse({ mode: 'cards' }).success).toBe(false)
  })

  it('accepts the roll action with no payload', () => {
    expect(clientSchemas.roll.safeParse({}).success).toBe(true)
  })

  it('declares playCard so phase two needs no wire change', () => {
    expect(clientSchemas.playCard).toBeDefined()
  })
})
