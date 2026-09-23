import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { appVersion } from '../../scripts/app-version.js'

/* Port 5050 rather than 5000: macOS Control Center binds 5000 for AirPlay,
   and the failure looks like a 403 from a server nobody started. */
const SERVER = 'http://localhost:5050'

export default defineConfig({
  plugins: [react()],
  /* The version this bundle is built as, baked in so a tab can compare it with
     the version the server stamps into every view. Same reader on both sides,
     one file: see scripts/app-version.ts. */
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  server: {
    proxy: {
      /* Host left alone: the server accepts a handshake whose Origin matches
         Host, and rewriting it to :5050 would refuse the dev page on :5173. */
      '/socket.io': { target: SERVER, ws: true },
      '/healthz': { target: SERVER, changeOrigin: true },
    },
  },
})
