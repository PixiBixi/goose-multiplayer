import { expect, test } from '@playwright/test'
import { createTable, CODE_PATTERN } from './helpers.js'

const EXACT_FINISH = /Arrivée exacte/

test('a direct link seats a guest, and only the host writes the rules', async ({ browser }) => {
  const host = await browser.newPage()
  const guest = await browser.newPage()

  const code = await createTable(host, 'Jérémy')
  expect(code).toMatch(CODE_PATTERN)

  /* The invite link, not the six characters typed in by hand: the code travels
     as a query parameter so a player can be invited with a URL. */
  await guest.goto(`/?table=${code}`)
  await guest.getByLabel('Ton nom').fill('Claire')
  await guest.getByRole('button', { name: 'Rejoindre' }).click()

  await expect(guest.getByTestId('room-code')).toHaveText(code)
  await expect(host.getByText('Claire')).toBeVisible()

  const hostSwitch = host.getByRole('checkbox', { name: EXACT_FINISH })
  const guestSwitch = guest.getByRole('checkbox', { name: EXACT_FINISH })

  await expect(hostSwitch).toBeChecked()
  await expect(guestSwitch).toBeChecked()

  /* click(), not uncheck(): the switch is controlled by the view the server
     sends back, so its state does not flip until the round trip lands, and
     uncheck() fails the moment it clicks. That round trip is the thing worth
     asserting, and the two expectations below are what assert it. */
  await hostSwitch.click()
  await expect(hostSwitch).not.toBeChecked()

  /* A rule the host changes has to reach the guest's screen, because the guest
     never derives it: the server publishes every seat its own view. */
  await expect(guestSwitch).not.toBeChecked()

  /* And the guest cannot write it back. The switch is disabled rather than
     merely ignored, so a guest is never invited to set a rule the server would
     refuse. */
  await expect(guestSwitch).toBeDisabled()
  await expect(guest.getByText("Seul l'hôte peut changer les règles.")).toBeVisible()
})

test('the opening nine ships on and greys out without two dice', async ({ browser }) => {
  const host = await browser.newPage()
  await createTable(host, 'Jérémy')

  const opening9 = host.getByRole('checkbox', { name: /Neuf d'ouverture/ })
  const twoDice = host.getByRole('checkbox', { name: /Deux dés/ })

  /* On by default: without it a 9 on the opening roll chains the geese to 63
     and wins before the second seat has played. */
  await expect(opening9).toBeChecked()

  await twoDice.click()
  await expect(twoDice).not.toBeChecked()
  await expect(opening9).toBeDisabled()
})
