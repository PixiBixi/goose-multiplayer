import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { appVersion } from './scripts/app-version.js'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
    },
    /* Two projects because the two halves need different worlds: the engine,
       the protocol and the server run headless, the client needs a DOM and
       the React transform. One shared environment would force jsdom on the
       server suite for nothing. */
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/*/src/**/*.test.ts',
            'apps/server/src/**/*.test.ts',
            /* tokens.test.ts reads the stylesheet off disk. Under jsdom the
               transform runs in web mode and import.meta.url is an http URL,
               which readFileSync refuses, so it belongs on this side. */
            'apps/web/src/styles/**/*.test.ts',
          ],
        },
      },
      {
        plugins: [react()],
        /* The same define apps/web/vite.config.ts sets: the client reads
           __APP_VERSION__ at module scope, so a suite without it would throw
           on the reference rather than test anything. */
        define: { __APP_VERSION__: JSON.stringify(appVersion()) },
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/src/**/*.test.{ts,tsx}'],
          exclude: ['apps/web/src/styles/**'],
          setupFiles: ['./apps/web/src/test-setup.ts'],
        },
      },
    ],
  },
})
