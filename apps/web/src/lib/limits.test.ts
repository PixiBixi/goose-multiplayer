import { clientSchemas } from '@goose/protocol'
import { describe, expect, it } from 'vitest'
import { validChat, validCode, validName } from './limits.js'

/* The client checks these by hand so zod stays out of its bundle. This is the
   one place that holds both to the server's schemas, so they cannot drift. */
describe('client-side limits', () => {
  const names = ['', ' ', 'Jérémy', 'x'.repeat(24), 'x'.repeat(25), '  Ana  ', ' '.repeat(30)]
  const codes = ['', 'HKD4P2', 'hkd4p2', ' HKD4P2 ', 'HKD4P', 'HKD4P22', 'HKD-P2', 'ÉÉÉÉÉÉ']
  const chats = ['', ' ', 'salut', 'x'.repeat(500), 'x'.repeat(501), '  salut  ']

  it('accepts a name exactly when the server does', () => {
    for (const value of names) {
      expect(validName(value)).toBe(clientSchemas.createRoom.shape.name.safeParse(value).success)
    }
  })

  it('accepts a room code exactly when the server does', () => {
    for (const value of codes) {
      expect(validCode(value)).toBe(clientSchemas.joinRoom.shape.code.safeParse(value).success)
    }
  })

  it('accepts a chat line exactly when the server does', () => {
    for (const value of chats) {
      expect(validChat(value)).toBe(clientSchemas.chat.shape.text.safeParse(value).success)
    }
  })
})
