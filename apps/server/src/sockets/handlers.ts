import { clientSchemas } from '@goose/protocol'
import type { TableConfig } from '@goose/engine'
import type { Server, Socket } from 'socket.io'
import type { RoomManager } from '../rooms/room-manager.js'
import type { ServerConfig } from '../config.js'
import { TooManyRoomsError } from '../rooms/room-manager.js'
import { clientIp } from '../security/client-ip.js'
import { createRateLimiter, type RateLimiter } from '../security/rate-limit.js'

type SessionData = {
  code: string
  seat: number
}

/* Generous enough that a normal player never notices it, tight enough that
   a scripted client cannot flood a room. Per socket, not per room: a table
   the size of MAX_SEATS still leaves each seat its own budget. A burst of 30,
   refilled at 3 a second. */
const RATE_LIMIT = { capacity: 30, refillPerSecond: 3 }

/* A returning player carries the token they were first seated with, so the
   manager can hand the seat straight back. RoomManager.reconnect existed and
   was tested from the day it was written, and nothing called it: a client
   action needs four things, and the handler is the one that gets forgotten.
   An unrecognised token is simply somebody new. */
function takeSeat(manager: RoomManager, code: string, name: string, session: string): number {
  try {
    return manager.reconnect(code, session)
  } catch {
    /* A code that matches no room throws again from join, with the same
       message, so this catch never hides a missing room. */
    return manager.join(code, name, session)
  }
}

function emitError(socket: Socket, code: string, message: string): void {
  socket.emit('error', { code, message })
}

/* Publishes the seat's own view of the table it is sitting at. No-op if the
   socket never joined a room (nothing to show) or the room is gone. */
function publish(socket: Socket, manager: RoomManager, code: string): void {
  const room = manager.get(code)
  const data = socket.data as Partial<SessionData>
  if (!room || data.seat === undefined) return
  socket.emit('tableView', room.view(data.seat))
}

/* Every seat at the table, each getting its own projection. Needed by the
   actions that change the room without going through RoomManager: those never
   reach the manager's onView, so answering only the socket that acted left
   the others staring at a table where nobody ever chatted, no rule ever
   changed and no rematch ever started. */
export function publishRoom(
  io: Server,
  manager: RoomManager,
  code: string,
  onError: (err: unknown) => void = () => undefined,
): void {
  const room = manager.get(code)
  if (!room) return
  io.in(code)
    .fetchSockets()
    .then((sockets) => {
      for (const other of sockets) {
        const data = other.data as Partial<SessionData>
        /* The seat is only meaningful at the table it was taken at: another
           table's seat number made view() throw and cut everyone else off. */
        if (data.code === code && data.seat !== undefined) {
          other.emit('tableView', room.view(data.seat))
        }
      }
    })
    .catch(onError)
}

/* One socket.on per key of clientSchemas, so the wire and the handlers can
   never drift apart: see handlers.test.ts, which checks that every key has a
   listener. Every handler validates its payload before touching the room,
   and never throws: an exception in a Socket.IO listener kills the
   connection silently, so every failure is emitted as an 'error' instead. */
export function registerHandlers(io: Server, manager: RoomManager, config: ServerConfig): void {
  const limiter = createRateLimiter(RATE_LIMIT)
  /* Keyed by client IP, so reconnecting gets no fresh bucket, and never
     forgotten on disconnect for the same reason: the limiter sweeps them. */
  const createLimiter = createRateLimiter({
    capacity: config.createBurst,
    refillPerSecond: config.createPerSecond,
  })
  const joinLimiter = createRateLimiter({
    capacity: config.joinBurst,
    refillPerSecond: config.joinPerSecond,
  })
  /* `code:seat` -> the socket holding it. Only that socket may mark the seat
     disconnected, or a closing first tab drops the seat a second tab now holds. */
  const owners = new Map<string, string>()
  const seatKey = (code: string, seat: number): string => `${code}:${seat}`

  /* The seat's previous socket, when a second tab or a reload that overlapped
     took it: it would otherwise keep acting as that seat. */
  const evict = (socketId: string): void => {
    const stale = io.sockets.sockets.get(socketId)
    if (!stale) return
    const data = stale.data as Partial<SessionData>
    if (data.code !== undefined) stale.leave(data.code)
    stale.data = {}
    stale.disconnect(true)
  }

  const sit = (socket: Socket, code: string, seatIndex: number): void => {
    const key = seatKey(code, seatIndex)
    const previous = owners.get(key)
    owners.set(key, socket.id)
    socket.data = { code, seat: seatIndex }
    socket.join(code)
    if (previous !== undefined && previous !== socket.id) evict(previous)
  }

  /* Gives up whatever seat this socket holds. Silent when it holds none, so it
     is safe before taking a seat anywhere. */
  const release = (socket: Socket): void => {
    const data = socket.data as Partial<SessionData>
    if (data.code === undefined || data.seat === undefined) return
    const key = seatKey(data.code, data.seat)
    if (owners.get(key) === socket.id) {
      owners.delete(key)
      manager.leave(data.code, data.seat)
    }
    socket.leave(data.code)
    socket.data = {}
  }

  io.on('connection', (socket: Socket) => {
    const ip = clientIp(socket.handshake, config.behindTls)
    const guard = (): boolean => {
      if (limiter.allow(socket.id)) return true
      emitError(socket, 'rate_limited', 'too many actions, slow down')
      return false
    }

    /** False after telling the caller it is over this per-IP budget. */
    const within = (budget: RateLimiter): boolean => {
      if (budget.allow(ip)) return true
      emitError(socket, 'rate_limited', 'too many actions, slow down')
      return false
    }

    const requireSeat = (): SessionData | null => {
      const data = socket.data as Partial<SessionData>
      if (data.code === undefined || data.seat === undefined) {
        emitError(socket, 'not_in_room', 'join a room before doing that')
        return null
      }
      return { code: data.code, seat: data.seat }
    }

    const run = (action: string, fn: () => void): void => {
      try {
        fn()
      } catch (err) {
        if (err instanceof TooManyRoomsError) {
          emitError(socket, 'rate_limited', err.message)
          return
        }
        emitError(socket, `${action}_failed`, err instanceof Error ? err.message : String(err))
      }
    }

    socket.on('createRoom', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.createRoom.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      // After the payload and before the room exists: a refusal leaves nothing half-created.
      if (!within(createLimiter)) return
      run('create', () => {
        release(socket)
        const code = manager.create(parsed.data.name, parsed.data.session, ip)
        sit(socket, code, 0)
        publish(socket, manager, code)
      })
    })

    socket.on('joinRoom', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.joinRoom.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      if (!within(joinLimiter)) return
      run('join', () => {
        const { code, name, session } = parsed.data
        // Walking to another table gives the old seat up; rejoining this one does not.
        const held = socket.data as Partial<SessionData>
        if (held.code !== code) release(socket)
        // One socket, one seat: only the seat it already holds may be claimed again.
        else if (manager.seatOf(code, session) !== held.seat) {
          throw new Error('this connection already holds a seat at this table')
        }
        sit(socket, code, takeSeat(manager, code, name, session))
        publish(socket, manager, code)
      })
    })

    socket.on('configureTable', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.configureTable.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      const session = requireSeat()
      if (!session) return
      run('configure', () => {
        /* Every rule is optional on the wire, but zod's optional() types the
           key as `T | undefined` rather than omitting it; exactOptionalPropertyTypes
           then refuses it as a Partial<TableConfig>, so drop the undefined ones. */
        const patch = Object.fromEntries(
          Object.entries(parsed.data).filter(([, value]) => value !== undefined),
        ) as Partial<TableConfig>
        manager.get(session.code)?.configure(session.seat, patch)
        publishRoom(io, manager, session.code)
      })
    })

    socket.on('startGame', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.startGame.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      const session = requireSeat()
      if (!session) return
      run('start', () => {
        manager.start(session.code, session.seat)
        publish(socket, manager, session.code)
      })
    })

    socket.on('roll', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.roll.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      const session = requireSeat()
      if (!session) return
      run('roll', () => {
        manager.roll(session.code, session.seat)
        publish(socket, manager, session.code)
      })
    })

    socket.on('chat', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.chat.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      const session = requireSeat()
      if (!session) return
      run('chat', () => {
        manager.get(session.code)?.chat(session.seat, parsed.data.text)
        publishRoom(io, manager, session.code)
      })
    })

    socket.on('leaveRoom', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.leaveRoom.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      const session = requireSeat()
      if (!session) return
      run('leave', () => {
        release(socket)
      })
    })

    socket.on('restart', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.restart.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      const session = requireSeat()
      if (!session) return
      run('restart', () => {
        manager.restart(session.code, session.seat)
        publish(socket, manager, session.code)
      })
    })

    socket.on('playCard', (payload: unknown) => {
      if (!guard()) return
      const parsed = clientSchemas.playCard.safeParse(payload)
      if (!parsed.success) {
        emitError(socket, 'bad_payload', parsed.error.message)
        return
      }
      /* Phase 2 only. Declared on the wire so it never has to change; every
         v1 table runs in classic mode, so this is always refused. */
      emitError(socket, 'mode_unsupported', 'this table does not run the card variant')
    })

    socket.on('disconnect', () => {
      // Before the seat check: a socket that never sat still has a bucket.
      limiter.forget(socket.id)
      const { code, seat } = socket.data as Partial<SessionData>
      if (code === undefined || seat === undefined) return
      const key = seatKey(code, seat)
      if (owners.get(key) !== socket.id) return
      owners.delete(key)
      run('disconnect', () => manager.disconnect(code, seat))
    })
  })
}
