import { expect, type Page } from '@playwright/test'

export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/

/* The server allows 30 actions per socket per 10 seconds. A loop that clicks as
   fast as the button re-enables trips that in a couple of seconds and the table
   stops answering, which reads exactly like a broken wire. Pacing the loop is
   the fix; loosening the limiter would be deleting the protection to please the
   test. */
const TURN_PACE_MS = 350

export async function createTable(page: Page, name: string): Promise<string> {
  await page.goto('/')
  await page.getByLabel('Ton nom').fill(name)
  await page.getByRole('button', { name: 'Créer une table' }).click()

  const code = (await page.getByTestId('room-code').textContent())?.trim() ?? ''
  expect(code).toMatch(CODE_PATTERN)
  return code
}

export async function joinTable(page: Page, name: string, code: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Ton nom').fill(name)
  await page.getByLabel('Code de la table').fill(code)
  await page.getByRole('button', { name: 'Rejoindre' }).click()
}

/* Play until somebody reaches the garden. Testing both ends of a chain proves
   nothing about the wire between them: this is the level that does.
   A round can also end with nobody winning, when every remaining seat is stuck,
   so the end condition is the game-over panel rather than a winner. */
export async function playToTheEnd(pages: Page[], maxTurns = 600): Promise<void> {
  const [first] = pages
  if (first === undefined) throw new Error('no pages to play with')

  for (let turn = 0; turn < maxTurns; turn++) {
    if (await first.getByTestId('game-over').isVisible()) return
    for (const page of pages) {
      const roll = page.getByRole('button', { name: 'Lancer les dés' })
      if (await roll.isEnabled().catch(() => false)) await roll.click()
    }
    await first.waitForTimeout(TURN_PACE_MS)
  }
  throw new Error(`no seat reached the garden in ${String(maxTurns)} turns`)
}
