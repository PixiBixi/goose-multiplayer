import { expect, test } from '@playwright/test'
import { createTable, joinTable, ROLL_BUTTON } from './helpers.js'

/* The feel of a single roll, through the real stack. The unit tests drive the
   clock by hand; this one watches the browser do it. */
test('the dice idle, tumble, and only then say what was rolled', async ({ browser }) => {
  const host = await browser.newPage()
  const guest = await browser.newPage()

  const code = await createTable(host, 'Jérémy')
  await joinTable(guest, 'Claire', code)
  await expect(host.getByText('Claire')).toBeVisible()
  await host.getByRole('button', { name: 'Commencer la partie' }).click()

  /* Nothing has been rolled: two blank faces, not a printed result under a
     button that still says "lancer les dés". */
  const idle = host.getByRole('img', { name: 'Dé, pas encore lancé' })
  await expect(idle).toHaveCount(2)
  await expect(host.getByTestId('turn-panel')).toHaveAttribute('data-playing', 'false')

  const roll = host.getByRole('button', { name: ROLL_BUTTON })
  await expect(roll).toBeEnabled()
  await roll.click()

  /* The tumble. The server already knows the result and the client is holding
     it back: what is on screen is a spin, labelled as one, and the button is
     out of reach for the whole sequence. */
  await expect(host.getByTestId('turn-panel')).toHaveAttribute('data-playing', 'true')
  await expect(host.getByRole('img', { name: 'Les dés roulent' })).toHaveCount(2)
  await expect(roll).toBeDisabled()
  /* And the turn on screen is still Jérémy's, whatever the server already
     decided: the next name in the heading would say the roll was not a
     double before the dice had said anything. */
  await expect(host.getByRole('heading', { name: 'À toi de jouer' })).toBeVisible()

  /* Then it settles on real faces and the log says what happened. The other
     tab plays the same chain off the same steps: the narration is the
     server's, not something either client worked out. */
  await expect(host.getByTestId('turn-panel')).toHaveAttribute('data-playing', 'false', {
    timeout: 15_000,
  })
  await expect(host.getByRole('img', { name: 'Les dés roulent' })).toHaveCount(0)
  await expect(host.locator('.turn-log li').first()).toContainText('Jérémy a fait')
  await expect(guest.locator('.turn-log li').first()).toContainText('Jérémy a fait')
})
