import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Home } from './Home.js'

function setup() {
  const onCreate = vi.fn()
  const onJoin = vi.fn()
  render(<Home onCreate={onCreate} onJoin={onJoin} error={null} />)
  return { onCreate, onJoin, user: userEvent.setup() }
}

describe('Home', () => {
  it('refuses to create a table without a name', async () => {
    const { onCreate, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Créer une table' }))
    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/nom/i)
  })

  it('creates a table once a name is there', async () => {
    const { onCreate, user } = setup()
    await user.type(screen.getByLabelText('Ton nom'), 'Jérémy')
    await user.click(screen.getByRole('button', { name: 'Créer une table' }))
    expect(onCreate).toHaveBeenCalledWith('Jérémy')
  })

  it('upper cases the table code while it is typed', async () => {
    const { user } = setup()
    const code = screen.getByLabelText('Code de la table')
    await user.type(code, 'hkd4p2')
    expect(code).toHaveValue('HKD4P2')
  })

  it('emits nothing on a code that the wire would refuse', async () => {
    const { onJoin, user } = setup()
    await user.type(screen.getByLabelText('Ton nom'), 'Jérémy')
    await user.type(screen.getByLabelText('Code de la table'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(onJoin).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/six/i)
  })

  it('joins with the upper cased code', async () => {
    const { onJoin, user } = setup()
    await user.type(screen.getByLabelText('Ton nom'), 'Claire')
    await user.type(screen.getByLabelText('Code de la table'), 'hkd4p2')
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(onJoin).toHaveBeenCalledWith('HKD4P2', 'Claire')
  })
})
