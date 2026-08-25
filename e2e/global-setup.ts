import { BASE_URL } from '../playwright.config.js'
import { compose, waitForHealth } from './stack.js'

/* Built rather than pulled: the point is to exercise the working tree, and a
   `pull` would test whatever was published last. */
export default async function globalSetup(): Promise<void> {
  compose('up', '--build', '-d', '--wait')
  await waitForHealth(BASE_URL)
}
