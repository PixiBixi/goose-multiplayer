import { makeRng } from '@goose/engine'
import { createServer, type Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { io as connect, type Socket } from 'socket.io-client'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../config.js'
import { RoomManager, systemClock } from '../rooms/room-manager.js'
import { registerHandlers } from './handlers.js'

/*
 * The abuse limits follow the client address, not the socket: a script that opens a
 * fresh connection per request must not get a fresh allowance with each one.
 */

let httpServer: HttpServer | null = null
let ioServer: Server | null = null
let url = ''
const clients: Socket[] = []

const start = async (env: Record<string, string>): Promise<void> => {
  // Budgets of two with a refill far slower than the test, so the third request is refused.
  const config = loadConfig({
    CREATE_BURST: '2',
    CREATE_PER_SECOND: '0.01',
    JOIN_BURST: '2',
    JOIN_PER_SECOND: '0.01',
    ...env,
  })
  httpServer = createServer()
  ioServer = new Server(httpServer)
  const manager = new RoomManager({
    clock: systemClock(),
    rng: makeRng(1),
    onView: () => undefined,
    maxRooms: 50,
    maxRoomsPerOwner: config.maxRoomsPerIp,
  })
  registerHandlers(ioServer, manager, config)
  await new Promise<void>((resolve) => httpServer?.listen(0, resolve))
  const address = httpServer.address()
  if (address === null || typeof address === 'string') throw new Error('expected a TCP address')
  url = `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect()
  await ioServer?.close()
  ioServer = null
  httpServer = null
})

/** A new connection, as a client behind `ip` would open one through Traefik. */
const clientFrom = (ip: string): Socket => {
  const client = connect(url, {
    transports: ['websocket'],
    forceNew: true,
    extraHeaders: { 'x-forwarded-for': ip },
  })
  clients.push(client)
  return client
}

type Reply = { event: 'tableView' | 'error'; code?: string }

/** What the server answers to one event: a table view, or an error with its code. */
const emit = (client: Socket, event: string, payload: unknown): Promise<Reply> =>
  new Promise((resolve) => {
    client.once('tableView', () => resolve({ event: 'tableView' }))
    client.once('error', (error: { code: string }) => resolve({ event: 'error', code: error.code }))
    client.emit(event, payload)
  })

let sessions = 0
const create = (client: Socket): Promise<Reply> =>
  emit(client, 'createRoom', { name: 'Ana', session: `session-${sessions++}` })

const refused: Reply = { event: 'error', code: 'rate_limited' }
const created: Reply = { event: 'tableView' }

describe('limits keyed by client IP', () => {
  it('shares the create budget across every socket from one address', async () => {
    await start({ BEHIND_TLS: 'true' })
    expect(await create(clientFrom('203.0.113.7'))).toEqual(created)
    expect(await create(clientFrom('203.0.113.7'))).toEqual(created)
    expect(await create(clientFrom('203.0.113.7'))).toEqual(refused)
    expect(await create(clientFrom('198.51.100.1'))).toEqual(created)
  })

  it('ignores X-Forwarded-For without the proxy, so a forged header buys nothing', async () => {
    await start({ BEHIND_TLS: 'false' })
    expect(await create(clientFrom('203.0.113.1'))).toEqual(created)
    expect(await create(clientFrom('203.0.113.2'))).toEqual(created)
    expect(await create(clientFrom('203.0.113.3'))).toEqual(refused)
  })

  it('caps the rooms one address holds, whatever the rate', async () => {
    await start({ BEHIND_TLS: 'true', CREATE_BURST: '10', MAX_ROOMS_PER_IP: '1' })
    expect(await create(clientFrom('203.0.113.7'))).toEqual(created)
    expect(await create(clientFrom('203.0.113.7'))).toEqual(refused)
  })

  it('limits joins per address, which bounds room code guessing', async () => {
    await start({ BEHIND_TLS: 'true' })
    const guess = (client: Socket) =>
      emit(client, 'joinRoom', { code: 'ZZZZZZ', name: 'Eve', session: 'eve' })
    const missing: Reply = { event: 'error', code: 'join_failed' }
    expect(await guess(clientFrom('203.0.113.7'))).toEqual(missing)
    expect(await guess(clientFrom('203.0.113.7'))).toEqual(missing)
    expect(await guess(clientFrom('203.0.113.7'))).toEqual(refused)
  })
})
