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
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeDisabled()
    }
    expect(screen.queryByRole('button', { name: 'Commencer la partie' })).toBeNull()
  })

  it('greys the opening nine out while the table rolls a single die', () => {
    setup(makeView({ config: { ...makeView().config, twoDice: false } }))
    expect(screen.getByRole('checkbox', { name: /Neuf d'ouverture/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Arrivée exacte/ })).toBeEnabled()
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
