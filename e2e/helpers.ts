import { expect, type Page } from '@playwright/test'

export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/

export const ROLL_BUTTON = 'Lancer les dés'

/* How long the suite is willing to wait for somebody to be able to roll. A
   turn is a 900ms dice tumble plus 450ms per step of the chain, so a long
   goose chain runs to about four seconds; this is that with room to spare,
   and short enough that a stuck table fails rather than hangs. */
const TURN_TIMEOUT_MS = 30_000
/* Poll interval, not animation pacing: nothing here is tuned to a duration. */
const POLL_MS = 100
/* A click has to be actionable within this, or the button went out from under
   us and the loop looks again. Playwright's own default is no timeout at all,
   which turns a button that disabled itself into a test that hangs. */
const CLICK_TIMEOUT_MS = 5_000

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

/* The seat whose roll button is live, or null once the game is over.

   Waiting on the button rather than on a delay is the whole point: the button
   comes back exactly when the client has finished playing the dice and the
   chain, so this paces itself off the real thing. A sleep tuned to an
   animation is a flake with a countdown on it, and it also silently trips the
   server's rate limiter the day the animation gets shorter. */
async function seatOnTurn(pages: Page[]): Promise<Page | null> {
  const [first] = pages
  if (first === undefined) throw new Error('no pages to play with')
  const deadline = Date.now() + TURN_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (await first.getByTestId('game-over').isVisible()) return null
    for (const page of pages) {
      const roll = page.getByRole('button', { name: ROLL_BUTTON })
      if (await roll.isEnabled().catch(() => false)) return page
    }
    await first.waitForTimeout(POLL_MS)
  }
  throw new Error('no seat could roll, and nobody reached the garden either')
}

/* Play until somebody reaches the garden. Testing both ends of a chain proves
   nothing about the wire between them: this is the level that does.
   A round can also end with nobody winning, when every remaining seat is stuck,
   so the end condition is the game-over panel rather than a winner. */
export async function playToTheEnd(pages: Page[], maxTurns = 600): Promise<void> {
  for (let turn = 0; turn < maxTurns; turn++) {
    const actor = await seatOnTurn(pages)
    if (actor === null) return
    try {
      await actor.getByRole('button', { name: ROLL_BUTTON }).click({ timeout: CLICK_TIMEOUT_MS })
    } catch {
      /* Somebody else's view landed between the check and the click, or the
         server rolled for this seat on its turn timer. Look again rather than
         wait out a click that will never become actionable. */
      continue
    }
  }
  throw new Error(`no seat reached the garden in ${String(maxTurns)} turns`)
}
