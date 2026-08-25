import { makeRng } from '@goose/engine'
import { clientSchemas } from '@goose/protocol'
import type { TableView } from '@goose/protocol'
import { describe, expect, it, vi } from 'vitest'
import { RoomManager, systemClock } from '../rooms/room-manager.js'
import { registerHandlers } from './handlers.js'

function fakeSocket(id = 'sock1') {
  const on = vi.fn()
  const emit = vi.fn()
  return { id, on, emit, join: vi.fn(), leave: vi.fn(), data: {} as Record<string, unknown> }
}

type FakeSocket = ReturnType<typeof fakeSocket>

/* Drives the real handlers against a real RoomManager, because the point of
   these two cases is the wire between them: RoomManager.reconnect was written
   and tested long before anything called it. */
function table() {
  const manager = new RoomManager({
    clock: systemClock(),
    rng: makeRng(7),
    onView: () => undefined,
  })
  let connect: (socket: unknown) => void = () => undefined
  registerHandlers(
    { on: (_: string, fn: (s: unknown) => void) => (connect = fn) } as never,
    manager,
  )
  return { manager, connect: (socket: FakeSocket) => connect(socket) }
}

function fire(socket: FakeSocket, action: string, payload: unknown): void {
  const handler = socket.on.mock.calls.find((call) => call[0] === action)?.[1] as (
    p: unknown,
  ) => void
  handler(payload)
}

function lastView(socket: FakeSocket): TableView {
  const views = socket.emit.mock.calls.filter((call) => call[0] === 'tableView')
  return views.at(-1)?.[1] as TableView
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

  it('gives a dropped player their seat back when the session token matches', () => {
    const { manager, connect } = table()

    const host = fakeSocket('a')
    connect(host)
    fire(host, 'createRoom', { name: 'Jérémy', session: 'token-host' })
    const code = lastView(host).code

    const guest = fakeSocket('b')
    connect(guest)
    fire(guest, 'joinRoom', { code, name: 'Claire', session: 'token-guest' })
    expect(lastView(guest).you.seat).toBe(1)

    fire(guest, 'disconnect', undefined)
    // publish() only answers the socket that acted; the broadcast to the rest
    // of the room is the server entry point's job, so read the room itself.
    expect(manager.get(code)?.view(0).seats[1]?.presence).toBe('disconnected')

    // Same player, new socket, same token: the seat comes straight back
    // instead of waiting out the grace period and being lost.
    const returning = fakeSocket('c')
    connect(returning)
    fire(returning, 'joinRoom', { code, name: 'Claire', session: 'token-guest' })
    const back = lastView(returning)
    expect(back.you.seat).toBe(1)
    expect(back.seats).toHaveLength(2)
    expect(back.seats[1]?.presence).toBe('active')
  })

  it('seats a different token somewhere else instead of handing it a seat', () => {
    const { connect } = table()

    const host = fakeSocket('a')
    connect(host)
    fire(host, 'createRoom', { name: 'Jérémy', session: 'token-host' })
    const code = lastView(host).code

    const guest = fakeSocket('b')
    connect(guest)
    fire(guest, 'joinRoom', { code, name: 'Claire', session: 'token-guest' })
    fire(guest, 'disconnect', undefined)

    const stranger = fakeSocket('c')
    connect(stranger)
    fire(stranger, 'joinRoom', { code, name: 'Malo', session: 'token-stranger' })
    const view = lastView(stranger)
    expect(view.you.seat).toBe(2)
    expect(view.seats).toHaveLength(3)
    expect(view.seats[1]?.presence).toBe('disconnected')
  })

  it('refuses a seat request with no session token at all', () => {
    const socket = fakeSocket()
    const io = { on: (_: string, fn: (s: unknown) => void) => fn(socket) }
    registerHandlers(io as never, {} as never)
    fire(socket, 'joinRoom', { code: 'ABC123', name: 'Claire' })
    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ code: 'bad_payload' }),
    )
  })
})
