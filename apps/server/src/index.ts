import { createServer } from 'node:http'
import { makeRng } from '@goose/engine'
import { Server } from 'socket.io'
import { loadConfig } from './config.js'
import { createApp } from './http.js'
import { createLogger } from './logger.js'
import { RoomManager, systemClock } from './rooms/room-manager.js'
import { registerHandlers } from './sockets/handlers.js'

const config = loadConfig(process.env)
const logger = createLogger(config.logLevel)
const app = createApp()
const httpServer = createServer(app)

const io = new Server(httpServer, config.corsOrigin ? { cors: { origin: config.corsOrigin } } : {})

/* Every seat gets its own projection of the table (its own legal moves, its
   own "you"), so a state change is published by fetching whoever is
   actually sitting in that Socket.IO room and sending each their own view,
   not by broadcasting one shared payload. */
function publishView(code: string): void {
  const room = manager.get(code)
  if (!room) return
  io.in(code)
    .fetchSockets()
    .then((sockets) => {
      for (const socket of sockets) {
        const seat = (socket.data as { seat?: number }).seat
        if (seat !== undefined) socket.emit('tableView', room.view(seat))
      }
    })
    .catch((err: unknown) => {
      logger.error('failed to publish table view', {
        code,
        error: err instanceof Error ? err.message : String(err),
      })
    })
}

const manager = new RoomManager({
  clock: systemClock(),
  rng: makeRng(Date.now()),
  onView: publishView,
})

registerHandlers(io, manager)

httpServer.listen(config.port, () => {
  logger.info(`listening on port ${config.port}`, { behindTls: config.behindTls })
})
