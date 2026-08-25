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

/* One socket.on per key of clientSchemas, so the wire and the handlers can
   never drift apart: see handlers.test.ts, which checks that every key has a
   listener. Every handler validates its payload before touching the room,
   and never throws: an exception in a Socket.IO listener kills the
   connection silently, so every failure is emitted as an 'error' instead. */
export function registerHandlers(io: Server, manager: RoomManager): void {
  const allow = makeRateLimiter({ ...RATE_LIMIT, clock: systemClock() })

  io.on('connection', (socket: Socket) => {
    const sessionId = socket.id

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
        const code = manager.create(parsed.data.name, sessionId)
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
        const { code, name } = parsed.data
        const seat = manager.join(code, name, sessionId)
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
        publish(socket, manager, session.code)
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
        publish(socket, manager, session.code)
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
        publish(socket, manager, session.code)
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
      const data = socket.data as Partial<SessionData>
      if (data.code !== undefined && data.seat !== undefined) {
        manager.disconnect(data.code, data.seat)
      }
    })
  })
}
