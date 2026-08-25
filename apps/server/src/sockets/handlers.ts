import { clientSchemas } from '@goose/protocol'
import type { TableConfig } from '@goose/engine'
import type { Server, Socket } from 'socket.io'
import { systemClock } from '../rooms/room-manager.js'
import type { RoomManager } from '../rooms/room-manager.js'
import { makeRateLimiter } from '../security/rate-limit.js'

type SessionData = {
  code: string
  seat: number
}

/* Generous enough that a normal player never notices it, tight enough that
   a scripted client cannot flood a room. Per socket, not per room: a table
   the size of MAX_SEATS still leaves each seat its own budget. */
const RATE_LIMIT = { windowMs: 10_000, max: 30 }

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
function publishRoom(io: Server, manager: RoomManager, code: string): void {
  const room = manager.get(code)
  if (!room) return
  io.in(code)
    .fetchSockets()
    .then((sockets) => {
      for (const other of sockets) {
        const seat = (other.data as Partial<SessionData>).seat
        if (seat !== undefined) other.emit('tableView', room.view(seat))
      }
    })
    .catch(() => {
      /* A failed fan-out is not worth killing the connection over: the next
         action republishes, and the actor already has its own view. */
    })
}

/* One socket.on per key of clientSchemas, so the wire and the handlers can
   never drift apart: see handlers.test.ts, which checks that every key has a
   listener. Every handler validates its payload before touching the room,
   and never throws: an exception in a Socket.IO listener kills the
   connection silently, so every failure is emitted as an 'error' instead. */
export function registerHandlers(io: Server, manager: RoomManager): void {
  const allow = makeRateLimiter({ ...RATE_LIMIT, clock: systemClock() })

  io.on('connection', (socket: Socket) => {
    const guard = (): boolean => {
      if (allow(socket.id)) return true
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
      run('create', () => {
        const code = manager.create(parsed.data.name, parsed.data.session)
        socket.data = { code, seat: 0 }
        socket.join(code)
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
      run('join', () => {
        const { code, name, session } = parsed.data
        const seat = takeSeat(manager, code, name, session)
        socket.data = { code, seat }
        socket.join(code)
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
        manager.get(session.code)?.leave(session.seat)
        publishRoom(io, manager, session.code)
        socket.leave(session.code)
        socket.data = {}
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
        manager.get(session.code)?.restart(session.seat)
        publishRoom(io, manager, session.code)
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
      const data = socket.data as Partial<SessionData>
      if (data.code !== undefined && data.seat !== undefined) {
        manager.disconnect(data.code, data.seat)
      }
    })
  })
}
