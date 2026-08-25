import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeSeat, makeView } from '../test-fixtures.js'
import { resizeTo } from '../test-setup.js'
import { Table } from './Table.js'

function setup(view = makeView({ phase: 'playing' })) {
  resizeTo(1000)
  const onRoll = vi.fn()
  const onChat = vi.fn()
  const onRestart = vi.fn()
  const onLeave = vi.fn()
  const { container } = render(
    <Table view={view} onRoll={onRoll} onChat={onChat} onRestart={onRestart} onLeave={onLeave} />,
  )
  return { container, onRoll, onChat, onRestart, onLeave, user: userEvent.setup() }
}

describe('Table', () => {
  it('lets the seat on turn roll', async () => {
    const { onRoll, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Lancer les dés' }))
    expect(onRoll).toHaveBeenCalled()
  })

  it('refuses the roll when the server listed no legal move for this seat', () => {
    setup(
      makeView({
        phase: 'playing',
        you: { seat: 1, name: 'Claire' },
        turn: { seat: 0, legalMoves: [], deadlineAt: null },
      }),
    )
    expect(screen.getByRole('button', { name: 'Lancer les dés' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: /Jérémy/ })).toBeInTheDocument()
  })

  it('draws the board and the dice the server rolled', () => {
    setup(
      makeView({
        phase: 'playing',
        lastTurn: { seat: 0, dice: [4, 3], steps: [{ kind: 'move', from: 0, to: 7, by: 7 }] },
      }),
    )
    expect(screen.getByTestId('board-spiral')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3' })).toBeInTheDocument()
  })

  it('narrates the chain the server sent, one line per step', () => {
    const { container } = setup(
      makeView({
        phase: 'playing',
        lastTurn: {
          seat: 0,
          dice: [3, 3],
          steps: [
            { kind: 'move', from: 0, to: 6, by: 6 },
            { kind: 'bridge', from: 6, to: 12 },
          ],
        },
      }),
    )
    // Scoped to the feed: the board itself names Le Pont in the square's
    // own <title>, which is a different thing being said in a different place.
    const log = container.querySelector('.turn-log')
    expect(log?.textContent).toMatch(/Pont/)
    expect(log?.querySelectorAll('li')).toHaveLength(3)
  })

  it('shows the end of game panel with the winner', () => {
    setup(
      makeView({
        phase: 'over',
        winner: 1,
        ranking: [1, 0],
        seats: [makeSeat(0, { position: 40 }), makeSeat(1, { position: 63 })],
        turn: { seat: 0, legalMoves: [], deadlineAt: null },
      }),
    )
    const panel = screen.getByTestId('game-over')
    expect(panel).toHaveTextContent('Claire')
    expect(panel).toHaveTextContent(/Jardin/)
  })

  it('sends a chat line and clears the field', async () => {
    const { onChat, user } = setup()
    const field = screen.getByPlaceholderText('Un mot à la table')
    await user.type(field, 'bien joué')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(onChat).toHaveBeenCalledWith('bien joué')
    expect(field).toHaveValue('')
  })

  it('refuses to send an empty chat line', async () => {
    const { onChat, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(onChat).not.toHaveBeenCalled()
  })

  it('shows what holds a blocked seat, in words and not in colour alone', () => {
    setup(
      makeView({
        phase: 'playing',
        seats: [makeSeat(0, { position: 31, blocked: 'well' }), makeSeat(1)],
        turn: { seat: 1, legalMoves: [], deadlineAt: null },
      }),
    )
    expect(screen.getByText('Au puits')).toBeInTheDocument()
  })
})
