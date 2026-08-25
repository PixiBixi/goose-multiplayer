import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* The deployment file first, the local overlay second. Order matters: the
   overlay supplies the Traefik and the plain-HTTP entrypoint, and everything
   else about the service under test comes from the file that ships. */
export const COMPOSE_ARGS = ['compose', '-f', 'compose.traefik.yaml', '-f', 'e2e/compose.e2e.yaml']

export function compose(...args: string[]): void {
  execFileSync('docker', [...COMPOSE_ARGS, ...args], { cwd: root, stdio: 'inherit' })
}

export async function waitForHealth(baseUrl: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError = 'never answered'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/healthz`)
      if (response.ok) {
        const body = (await response.json()) as { status?: string }
        if (body.status === 'ok') return
        lastError = `healthz said ${JSON.stringify(body)}`
      } else {
        /* A 404 here is Traefik answering with no route: the container is up
           but the provider has not discovered its labels yet, or never will. */
        lastError = `healthz returned ${String(response.status)}`
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
    await new Promise((done) => setTimeout(done, 500))
  }
  throw new Error(`the stack never became healthy at ${baseUrl}: ${lastError}`)
}
