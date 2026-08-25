import { expect, test } from '@playwright/test'
import { createTable, joinTable, playToTheEnd } from './helpers.js'

const GUESTS = ['Claire', 'Malik', 'Inès', 'Tom', 'Zoé']
const SEVENTH = 'Nadia'

test('a full table of six plays out, and a seventh is turned away', async ({ browser }) => {
  const host = await browser.newPage()
  const guests = await Promise.all(GUESTS.map(() => browser.newPage()))

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
  const seventh = await browser.newPage()
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
