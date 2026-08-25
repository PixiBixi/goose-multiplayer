import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/* Port 5050 rather than 5000: macOS Control Center binds 5000 for AirPlay,
   and the failure looks like a 403 from a server nobody started. */
const SERVER = 'http://localhost:5050'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': { target: SERVER, ws: true, changeOrigin: true },
      '/healthz': { target: SERVER, changeOrigin: true },
    },
  },
})
