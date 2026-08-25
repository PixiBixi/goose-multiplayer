import { act, render, screen } from '@testing-library/react'
import type { SeatView } from '@goose/protocol'
import { describe, expect, it } from 'vitest'
import { resizeTo } from '../test-setup.js'
import { Board } from './Board.js'

const seats: SeatView[] = [
  {
    seat: 0,
    name: 'Jérémy',
    presence: 'active',
    position: 27,
    blocked: null,
    skipTurns: 0,
    colour: '#e63946',
  },
  {
    seat: 1,
    name: 'Claire',
    presence: 'active',
    position: 0,
    blocked: null,
    skipTurns: 0,
    colour: '#2a9d8f',
  },
]

describe('Board', () => {
  it('renders the boustrophedon grid in a narrow container', () => {
    resizeTo(400)
    render(<Board seats={seats} highlight={null} />)
    expect(screen.getByTestId('board-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('board-spiral')).toBeNull()
  })

  it('renders the spiral once the container has the room for it', () => {
    resizeTo(1000)
    render(<Board seats={seats} highlight={null} />)
    expect(screen.getByTestId('board-spiral')).toBeInTheDocument()
    expect(screen.queryByTestId('board-grid')).toBeNull()
  })

  it('switches on the container width, not on the window width', () => {
    resizeTo(1000)
    const { container } = render(<Board seats={seats} highlight={null} />)
    expect(container.querySelector('.board')).toHaveAttribute('data-renderer', 'spiral')
    // The observer fires outside React's own event loop, so the flush has to
    // be asked for explicitly; in the browser React schedules it itself.
    act(() => {
      resizeTo(400)
    })
    expect(container.querySelector('.board')).toHaveAttribute('data-renderer', 'grid')
  })

  it('draws every square with its number, in both renderers', () => {
    for (const width of [400, 1000]) {
      resizeTo(width)
      const { container, unmount } = render(<Board seats={seats} highlight={null} />)
      const squares = container.querySelectorAll('[data-square]')
      expect(squares, `renderer at ${width}px`).toHaveLength(width < 700 ? 63 : 62)
      unmount()
    }
  })

  it('seats a pawn per player, including the ones still off the board', () => {
    resizeTo(1000)
    const { container } = render(<Board seats={seats} highlight={null} />)
    expect(container.querySelectorAll('[data-pawn]')).toHaveLength(2)
  })

  it('rings the square the chain is standing on', () => {
    resizeTo(1000)
    const { container } = render(<Board seats={seats} highlight={31} />)
    expect(container.querySelector('.board-highlight')).not.toBeNull()
  })
})
