import { describe, expect, it } from 'vitest'
import { clientSchemas } from './schemas.js'

describe('client schemas', () => {
  it('accepts a well-formed join', () => {
    const r = clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: 'Claire' })
    expect(r.success).toBe(true)
  })

  it('upper-cases and trims the room code', () => {
    const r = clientSchemas.joinRoom.parse({ code: ' hkd4p2 ', name: 'Claire' })
    expect(r.code).toBe('HKD4P2')
  })

  it('rejects a name that is empty or too long', () => {
    expect(clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: '' }).success).toBe(false)
    expect(clientSchemas.joinRoom.safeParse({ code: 'HKD4P2', name: 'x'.repeat(25) }).success).toBe(
      false,
    )
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
