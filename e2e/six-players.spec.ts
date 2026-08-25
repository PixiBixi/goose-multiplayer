import { expect, test } from '@playwright/test'
import { createTable, joinTable, playToTheEnd } from './helpers.js'

const GUESTS = ['Claire', 'Malik', 'Inès', 'Tom', 'Zoé']
const SEVENTH = 'Nadia'

test('a full table of six plays out, and a seventh is turned away', async ({ browser }) => {
  /* Reduced motion, and only here: a full table of six is dozens of turns,
     and each one now plays a dice tumble and a chain step by step. This test
     is about six seats, a seventh being turned away and a game reaching its
     end through the real stack; game.spec.ts is the one that plays the
     animation for real. The switch is the accessibility preference the client
     already honours, not a test-only back door. */
  /* One context per page, as before: the session token lives in localStorage,
     and six guests sharing a context all claim the same seat. */
  const seat = () => browser.newPage({ reducedMotion: 'reduce' })
  const host = await seat()
  const guests = await Promise.all(GUESTS.map(() => seat()))

  const code = await createTable(host, 'Jérémy')

  /* One at a time, not in parallel: six sockets racing to sit down is a
     different test, and this one is about the table being full. */
  for (const [index, page] of guests.entries()) {
    await joinTable(page, GUESTS[index] as string, code)
    await expect(page.getByTestId('room-code')).toHaveText(code)
  }

  for (const name of GUESTS) {
    await expect(host.getByText(name)).toBeVisible()
  }

  /* Six is the ceiling. The seventh gets the refusal from the server, never a
     seventh seat, and stays on the home screen. */
  const seventh = await seat()
  await joinTable(seventh, SEVENTH, code)
  await expect(seventh.getByRole('alert')).toContainText('table pleine')
  await expect(seventh.getByTestId('room-code')).toHaveCount(0)
  await expect(host.getByText(SEVENTH)).toHaveCount(0)

  await host.getByRole('button', { name: 'Commencer la partie' }).click()

  const table = [host, ...guests]
  await playToTheEnd(table)

  for (const page of table) {
    await expect(page.getByTestId('game-over')).toBeVisible()
  }
})
