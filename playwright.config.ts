import { defineConfig, devices } from '@playwright/test'

/* Port 8088 rather than 80 or 5050: this stack shares a machine with whatever
   else the developer is running, and both of those are usually taken. */
const PORT = process.env.E2E_PORT ?? '8088'

export const BASE_URL = `http://127.0.0.1:${PORT}`

/* The suite drives a real Traefik in front of the real image, not a dev server.
   A dev server proxies the WebSocket upgrade for you, which is precisely the
   thing that breaks in production and the thing this suite exists to prove. */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  /* A full six-player game is several dozen turns, each paced to stay under the
     server's rate limiter, and every goose chain plays an animation. */
  timeout: 300_000,
  expect: { timeout: 20_000 },
  /* One worker: the tests share one server holding its rooms in memory, and a
     six-player table is already six browser contexts. */
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
