import { loadConfig } from './config.js'
import { createApp } from './http.js'
import { createLogger } from './logger.js'

const config = loadConfig(process.env)
const logger = createLogger(config.logLevel)
const app = createApp()

app.listen(config.port, () => {
  logger.info(`listening on port ${config.port}`, { behindTls: config.behindTls })
})
