import { createServer } from 'node:http'
import { makeRng } from '@goose/engine'
import { Server } from 'socket.io'
import { loadConfig } from './config.js'
import { createApp } from './http.js'
import { createLogger } from './logger.js'
import { RoomManager, systemClock } from './rooms/room-manager.js'
import { isAllowedOrigin } from './security/origin.js'
import { publishRoom, registerHandlers } from './sockets/handlers.js'

const config = loadConfig(process.env)
const logger = createLogger(config.logLevel)
const app = createApp()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  ...(config.corsOrigin ? { cors: { origin: config.corsOrigin } } : {}),
  allowRequest: (req, callback) => {
    callback(null, isAllowedOrigin(req.headers.origin, req.headers.host, config.corsOrigin))
  },
  // Every client payload is under 1 KiB; the 1 MB default only helps a flood.
  maxHttpBufferSize: 16 * 1024,
})

/* Every seat gets its own projection of the table (its own legal moves, its
   own "you"), so a state change is published by fetching whoever is
   actually sitting in that Socket.IO room and sending each their own view,
   not by broadcasting one shared payload. */
function publishView(code: string): void {
  publishRoom(io, manager, code, (err: unknown) => {
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
