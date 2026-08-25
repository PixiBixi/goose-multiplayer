import { clientSchemas } from '@goose/protocol'
import { describe, expect, it, vi } from 'vitest'
import { registerHandlers } from './handlers.js'

function fakeSocket() {
  const on = vi.fn()
  const emit = vi.fn()
  return { id: 'sock1', on, emit, join: vi.fn(), data: {} }
}

describe('handlers', () => {
  it('registers one listener per declared client action', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    const registered = socket.on.mock.calls.map((c) => c[0] as string)
    for (const action of Object.keys(clientSchemas)) {
      // The handler is the piece that gets forgotten. Testing both ends of a
      // chain proves nothing about the wire between them.
      expect(registered).toContain(action)
    }
  })

  it('rejects a payload that fails its schema without throwing', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    const chat = socket.on.mock.calls.find((c) => c[0] === 'chat')?.[1] as (p: unknown) => void
    expect(() => chat({ text: '' })).not.toThrow()
    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ code: 'bad_payload' }),
    )
  })

  it('refuses playCard while the table runs in classic mode', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    const play = socket.on.mock.calls.find((c) => c[0] === 'playCard')?.[1] as (p: unknown) => void
    play({ cardId: 'x' })
    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ code: 'mode_unsupported' }),
    )
  })
})
