import { expect, test } from '@playwright/test'
import { createTable, joinTable, playToTheEnd } from './helpers.js'

test('two players finish a game through the real stack', async ({ browser }) => {
  const host = await browser.newPage()
  const guest = await browser.newPage()

  const code = await createTable(host, 'Jérémy')
  await joinTable(guest, 'Claire', code)

  await expect(host.getByText('Claire')).toBeVisible()
  await host.getByRole('button', { name: 'Commencer la partie' }).click()

  await playToTheEnd([host, guest])

  await expect(host.getByTestId('game-over')).toBeVisible()
  await expect(guest.getByTestId('game-over')).toBeVisible()
})
