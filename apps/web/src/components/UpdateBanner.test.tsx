import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { UpdateBanner } from './UpdateBanner.js'

describe('UpdateBanner', () => {
  it('says nothing while the tab and the server agree', () => {
    render(<UpdateBanner built="v0.5.0" running="v0.5.0" />)
    expect(screen.queryByTestId('update-banner')).toBeNull()
  })

  /* The whole point: this tab was loaded before a deploy and is still running
     the old bundle, which is why it may meet rules it cannot name. */
  it('tells the player when the server has moved on, and why it matters', () => {
    render(<UpdateBanner built="v0.5.0" running="v0.6.0" />)
    const banner = screen.getByTestId('update-banner')
    expect(banner).toHaveTextContent('Nouvelle version en ligne')
    expect(banner).toHaveTextContent(/recharge la page/i)
    /* It offers the reload, it never performs one: a page that reloads under a
       player in the middle of a turn costs them the turn. */
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
  })

  it('goes away for good when the player puts it off', async () => {
    const user = userEvent.setup()
    render(<UpdateBanner built="v0.5.0" running="v0.6.0" />)
    await user.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByTestId('update-banner')).toBeNull()
  })

  it('stays quiet when either side could not read its own version', () => {
    /* 'dev' is what a build with no changelog beside it reports. Unreadable is
       not "different", and a banner in front of every local player is noise. */
    render(<UpdateBanner built="dev" running="v0.6.0" />)
    expect(screen.queryByTestId('update-banner')).toBeNull()
    render(<UpdateBanner built="v0.5.0" running="dev" />)
    expect(screen.queryByTestId('update-banner')).toBeNull()
  })

  /* The comparison only means anything if the build really baked a version in:
     vite defines __APP_VERSION__, and vitest.config.ts defines the same thing
     so this suite tests the mechanism the banner rests on. */
  it('is fed a version baked in at build time, not looked up at runtime', () => {
    expect(typeof __APP_VERSION__).toBe('string')
    expect(__APP_VERSION__.length).toBeGreaterThan(0)
  })

  it('never interrupts: it is a status, not an alert', () => {
    render(<UpdateBanner built="v0.5.0" running="v0.6.0" />)
    /* role="status" is announced politely and steals no focus, which an
       alert would do in the middle of somebody's turn. */
    expect(screen.getByTestId('update-banner')).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
