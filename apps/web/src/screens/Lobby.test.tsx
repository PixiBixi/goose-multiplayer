import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeSeat, makeView } from '../test-fixtures.js'
import { Lobby } from './Lobby.js'

function setup(view = makeView()) {
  const onConfigure = vi.fn()
  const onStart = vi.fn()
  const onLeave = vi.fn()
  render(<Lobby view={view} onConfigure={onConfigure} onStart={onStart} onLeave={onLeave} />)
  return { onConfigure, onStart, onLeave, user: userEvent.setup() }
}

describe('Lobby', () => {
  it('shows the six characters the other players have to type', () => {
    setup()
    expect(screen.getByTestId('room-code')).toHaveTextContent('HKD4P2')
  })

  it('lets the host work the rule switches', async () => {
    const { onConfigure, user } = setup()
    const rescue = screen.getByRole('checkbox', { name: /Sauvetage/ })
    expect(rescue).toBeEnabled()
    await user.click(rescue)
    expect(onConfigure).toHaveBeenCalledWith({ rescue: false })
  })

  it('shows a guest the rules without letting them change any', () => {
    setup(makeView({ you: { seat: 1, name: 'Claire' }, host: 0 }))
    for (const box of [...screen.getAllByRole('checkbox'), ...screen.getAllByRole('radio')]) {
      expect(box).toBeDisabled()
    }
    expect(screen.queryByRole('button', { name: 'Commencer la partie' })).toBeNull()
  })

  it('greys the opening nine out while the table rolls a single die', () => {
    setup(makeView({ config: { ...makeView().config, twoDice: false } }))
    expect(screen.getByRole('checkbox', { name: /Neuf d'ouverture/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Arrivée exacte/ })).toBeEnabled()
  })

  it('greys the doubles rule out for the same reason: no double on one die', () => {
    setup(makeView({ config: { ...makeView().config, twoDice: false } }))
    expect(screen.getByRole('checkbox', { name: /Double rejoue/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Le tour passe/ })).toBeDisabled()
  })

  it('greys the third double out when a double grants nothing anyway', () => {
    setup(makeView({ config: { ...makeView().config, doubleAgain: false } }))
    expect(screen.getByRole('checkbox', { name: /Double rejoue/ })).toBeEnabled()
    expect(screen.getByRole('radio', { name: /Retour au départ/ })).toBeDisabled()
  })

  it('greys the freeing double out on one die, where no double exists', () => {
    setup(makeView({ config: { ...makeView().config, twoDice: false } }))
    expect(screen.getByRole('checkbox', { name: /Double libérateur/ })).toBeDisabled()
  })

  it('lets the host say how long a trap keeps its player', async () => {
    const { onConfigure, user } = setup()
    expect(screen.getByRole('radio', { name: /3 tours/ })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /2 tours/ }))
    expect(onConfigure).toHaveBeenCalledWith({ maxBlockedTurns: 2 })
  })

  it('keeps the historic table on the panel, as a choice and not as a default', async () => {
    const { onConfigure, user } = setup()
    await user.click(screen.getByRole('radio', { name: /Jamais/ }))
    expect(onConfigure).toHaveBeenCalledWith({ maxBlockedTurns: null })
  })

  it('lets the host pick what a third double costs', async () => {
    const { onConfigure, user } = setup()
    const pass = screen.getByRole('radio', { name: /Le tour passe/ })
    const restart = screen.getByRole('radio', { name: /Retour au départ/ })
    // 'pass' is the default the server ships, and neither option is an off.
    expect(pass).toBeChecked()
    await user.click(restart)
    expect(onConfigure).toHaveBeenCalledWith({ tripleDouble: 'restart' })
  })

  it('refuses to start a table nobody has joined yet', () => {
    setup(makeView({ seats: [makeSeat(0)] }))
    expect(screen.getByRole('button', { name: 'Commencer la partie' })).toBeDisabled()
  })

  it('starts the game on the host command', async () => {
    const { onStart, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Commencer la partie' }))
    expect(onStart).toHaveBeenCalled()
  })
})
