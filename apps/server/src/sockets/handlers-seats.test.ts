import { makeRng } from '@goose/engine'
import type { TableView } from '@goose/protocol'
import { describe, expect, it, vi } from 'vitest'
import { RoomManager, systemClock } from '../rooms/room-manager.js'
import { publishRoom, registerHandlers } from './handlers.js'

/* A Socket.IO stand-in that keeps real room membership, because every case here
   is about which socket is still sitting where. */
function server() {
  const sockets = new Map<string, FakeSocket>()
  let connect: (socket: unknown) => void = () => undefined
  const io = {
    on: (_: string, fn: (s: unknown) => void) => (connect = fn),
    sockets: { sockets },
    in: (code: string) => ({
      fetchSockets: () =>
        Promise.resolve([...sockets.values()].filter((socket) => socket.rooms.has(code))),
    }),
  }
  const manager = new RoomManager({
    clock: systemClock(),
    rng: makeRng(7),
    onView: (code) => publishRoom(io as never, manager, code),
  })
  registerHandlers(io as never, manager)

  const client = (id: string): FakeSocket => {
    const socket: FakeSocket = {
      id,
      rooms: new Set<string>(),
      data: {},
      on: vi.fn(),
      emit: vi.fn(),
      join: (code: string) => socket.rooms.add(code),
      leave: (code: string) => socket.rooms.delete(code),
      disconnect: vi.fn(() => {
        sockets.delete(id)
        fire(socket, 'disconnect', undefined)
      }),
    }
    sockets.set(id, socket)
    connect(socket)
    return socket
  }
  return { manager, client }
}

type FakeSocket = {
  id: string
  rooms: Set<string>
  data: Record<string, unknown>
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  join: (code: string) => void
  leave: (code: string) => void
  disconnect: ReturnType<typeof vi.fn>
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

const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('a socket walking to another table', () => {
  it('gives up the seat it was holding at the old one', async () => {
    const { manager, client } = server()
    const host = client('a')
    fire(host, 'createRoom', { name: 'Ana', session: 's-ana' })
    await settle()
    const first = lastView(host).code

    const walker = client('b')
    fire(walker, 'joinRoom', { code: first, name: 'Ben', session: 's-ben' })
    fire(walker, 'createRoom', { name: 'Ben', session: 's-ben' })
    await settle()

    expect(manager.get(first)?.view(0).seats[1]?.presence).toBe('left')
    expect(walker.rooms.has(first)).toBe(false)
  })

  it('keeps the old table receiving views when the walker held a higher seat', async () => {
    // A seat number from the new table used to reach the old one's view() and throw,
    // which aborted the fan-out for everybody still sitting there.
    const { client } = server()
    const other = client('x')
    fire(other, 'createRoom', { name: 'Xa', session: 's-x' })
    await settle()
    const busy = lastView(other).code
    for (const [id, name] of [
      ['y', 'Yo'],
      ['z', 'Zed'],
    ] as const) {
      fire(client(id), 'joinRoom', { code: busy, name, session: `s-${id}` })
    }

    const host = client('a')
    fire(host, 'createRoom', { name: 'Ana', session: 's-ana' })
    await settle()
    const quiet = lastView(host).code

    const walker = client('b')
    fire(walker, 'joinRoom', { code: quiet, name: 'Ben', session: 's-ben' })
    fire(walker, 'joinRoom', { code: busy, name: 'Ben', session: 's-ben' })
    await settle()

    fire(host, 'chat', { text: 'still here' })
    await settle()
    expect(lastView(host).chat.map((line) => line.text)).toEqual(['still here'])
  })
})

describe('a second tab on the same seat', () => {
  it('takes the seat over and disconnects the first tab', async () => {
    const { manager, client } = server()
    const host = client('a')
    fire(host, 'createRoom', { name: 'Ana', session: 's-ana' })
    await settle()
    const code = lastView(host).code
    const first = client('b')
    fire(first, 'joinRoom', { code, name: 'Ben', session: 's-ben' })

    const second = client('c')
    fire(second, 'joinRoom', { code, name: 'Ben', session: 's-ben' })
    await settle()

    expect(first.disconnect).toHaveBeenCalled()
    // The first tab going away must not mark the seat the second tab now holds.
    expect(manager.get(code)?.view(0).seats[1]?.presence).toBe('active')
    expect(lastView(second).you.seat).toBe(1)
  })
})
