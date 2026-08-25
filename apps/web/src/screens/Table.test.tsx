import { act, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TableView } from '@goose/protocol'
import { makeSeat, makeView } from '../test-fixtures.js'
import { resizeTo, setReducedMotion } from '../test-setup.js'
import { Table } from './Table.js'

/* Reduced motion by default: most of these tests are about what the table
   says, not how it moves, and the ones that are about the motion turn it back
   on and drive the clock by hand. */
function setup(view: TableView = makeView({ phase: 'playing' }), reduced = true) {
  setReducedMotion(reduced)
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

const rolled = (dice: number[]): TableView =>
  makeView({
    phase: 'playing',
    lastTurn: { seat: 0, dice, steps: [{ kind: 'move', from: 0, to: 7, by: 7 }] },
  })

describe('Table', () => {
  it('lets the seat on turn roll', async () => {
    const { onRoll, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Lancer les dés' }))
    expect(onRoll).toHaveBeenCalled()
  })

  it('goes down on the click, not on the answer that comes back', async () => {
    // The view takes a round trip. A button still live inside that window is
    // a second roll the server refuses, and an error banner for the player.
    const { onRoll, user } = setup()
    const roll = screen.getByRole('button', { name: 'Lancer les dés' })
    await user.click(roll)
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(roll).toBeDisabled()
    await user.click(roll)
    expect(onRoll).toHaveBeenCalledTimes(1)
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
    setup(rolled([4, 3]))
    expect(screen.getByTestId('board-spiral')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3' })).toBeInTheDocument()
  })

  it('shows dice that are visibly not a result before anyone has rolled', () => {
    setup()
    // Two blank faces, not a printed 2 and 5: a result on screen under a
    // button that says "lancer les dés" tells the player the turn is over.
    expect(screen.getAllByRole('img', { name: 'Dé, pas encore lancé' })).toHaveLength(2)
    for (let face = 1; face <= 6; face++) {
      expect(screen.queryByRole('img', { name: String(face) })).toBeNull()
    }
  })

  it('shows one idle die when the table rolls a single die', () => {
    setup(makeView({ phase: 'playing', config: { ...makeView().config, twoDice: false } }))
    expect(screen.getAllByRole('img', { name: 'Dé, pas encore lancé' })).toHaveLength(1)
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

  it('says why a seat rolls again on a double, rather than leaving it to guess', () => {
    const { container } = setup(
      makeView({
        phase: 'playing',
        lastTurn: {
          seat: 0,
          dice: [3, 3],
          steps: [
            { kind: 'move', from: 0, to: 6, by: 6 },
            { kind: 'bridge', from: 6, to: 12 },
            { kind: 'double', seat: 0, dice: [3, 3] },
          ],
        },
      }),
    )
    expect(container.querySelector('.turn-log')?.textContent).toMatch(/Double 3 : Jérémy rejoue/)
  })

  it('narrates a third double off the step, never off the rule', () => {
    const { container } = setup(
      makeView({
        phase: 'playing',
        lastTurn: {
          seat: 0,
          dice: [2, 2],
          steps: [
            { kind: 'move', from: 8, to: 12, by: 4 },
            { kind: 'tripleDouble', seat: 0, outcome: 'restart', from: 12, to: 0 },
          ],
        },
      }),
    )
    expect(container.querySelector('.turn-log')?.textContent).toMatch(/repart du départ/)
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

describe('Table, the roll it plays out', () => {
  const TUMBLE_MS = 900
  const STEP_MS = 450
  const CARD_MS = 3000

  it('keeps the result unreadable until the tumble ends, then lands on it', () => {
    vi.useFakeTimers()
    const { container } = setup(rolled([6, 6]), false)

    // The server already knows the roll. Nothing on screen may say so: not a
    // pip, not a label, not the log.
    expect(screen.getAllByRole('img', { name: 'Les dés roulent' })).toHaveLength(2)
    expect(screen.queryByRole('img', { name: '6' })).toBeNull()
    expect(container.querySelector('.turn-log')?.textContent).toMatch(/encore lancé/)
    expect(screen.getByRole('button', { name: 'Lancer les dés' })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(TUMBLE_MS)
    })
    expect(screen.getAllByRole('img', { name: '6' })).toHaveLength(2)
    expect(container.querySelector('.turn-log')?.textContent).toMatch(/Jérémy a fait 12/)
  })

  it('holds whose turn it is until the chain has played', () => {
    vi.useFakeTimers()
    setup(
      makeView({
        phase: 'playing',
        lastTurn: { seat: 0, dice: [4, 3], steps: [{ kind: 'move', from: 0, to: 7, by: 7 }] },
        turn: { seat: 1, legalMoves: [], deadlineAt: null },
      }),
      false,
    )
    // The server has already passed the turn to Claire. Saying so while the
    // dice are still spinning tells the player the roll was not a double,
    // which is the result arriving early by another route.
    expect(screen.getByRole('heading', { name: 'À toi de jouer' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(TUMBLE_MS)
    })
    expect(screen.getByRole('heading', { name: 'À toi de jouer' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(STEP_MS)
    })
    expect(screen.getByRole('heading', { name: /Claire/ })).toBeInTheDocument()
  })

  it('does not let the seat list give the roll away while the dice spin', () => {
    vi.useFakeTimers()
    const { container } = setup(
      makeView({
        phase: 'playing',
        seats: [makeSeat(0, { position: 31, blocked: 'well' }), makeSeat(1)],
        lastTurn: {
          seat: 0,
          dice: [1, 1],
          steps: [
            { kind: 'move', from: 29, to: 31, by: 2 },
            { kind: 'blocked', seat: 0, at: 31, reason: 'well' },
          ],
        },
        turn: { seat: 1, legalMoves: [], deadlineAt: null },
      }),
      false,
    )
    // "Case 31" and "Au puits" in the rail are the roll spelled out. The rail
    // reads the chain, like the board does, so it says neither of them yet.
    // Scoped to the seat list: the board names every square in its own titles.
    const where = () => container.querySelector('.seat-list')?.textContent ?? ''
    expect(where()).toContain('Case 29')
    expect(where()).not.toContain('Au puits')

    // The dice settle and the move plays: the pawn is on 31, and still
    // nothing about the well, because the step that says so has not played.
    act(() => {
      vi.advanceTimersByTime(TUMBLE_MS)
    })
    expect(where()).toContain('Case 31')
    expect(where()).not.toContain('Au puits')

    act(() => {
      vi.advanceTimersByTime(STEP_MS)
    })
    expect(where()).toContain('Au puits')
  })

  it('holds the roll button through the dice and the walk, and gives it back after', () => {
    vi.useFakeTimers()
    const { container } = setup(
      makeView({
        phase: 'playing',
        lastTurn: {
          seat: 0,
          dice: [3, 2],
          steps: [
            { kind: 'move', from: 0, to: 5, by: 5 },
            { kind: 'goose', from: 5, to: 10, by: 5 },
          ],
        },
      }),
      false,
    )
    const roll = screen.getByRole('button', { name: 'Lancer les dés' })
    const panel = container.querySelector('.turn-panel')

    expect(roll).toBeDisabled()
    expect(panel).toHaveAttribute('data-playing', 'true')

    // The dice settle, and the chain starts: still nobody's turn to roll.
    act(() => {
      vi.advanceTimersByTime(TUMBLE_MS)
    })
    expect(roll).toBeDisabled()
    expect(container.querySelectorAll('.turn-log li')).toHaveLength(2)

    // The goose is a second advance and gets its own line, in its own time.
    act(() => {
      vi.advanceTimersByTime(STEP_MS)
    })
    expect(container.querySelector('.turn-log')?.textContent).toMatch(/L'oie de la case 5/)
    expect(roll).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(STEP_MS)
    })
    /* The chain has finished, and the goose card is still explaining why the
       oie relaunches. The button belongs to the card until it goes: a roll
       fired now would land a new turn on top of the rule being read. */
    expect(roll).toBeDisabled()
    expect(panel).toHaveAttribute('data-playing', 'true')
    expect(screen.getByTestId('rule-card')).toHaveAttribute('data-rule', 'goose')

    act(() => {
      vi.advanceTimersByTime(CARD_MS)
    })
    expect(screen.queryByTestId('rule-card')).toBeNull()
    expect(roll).toBeEnabled()
    expect(panel).toHaveAttribute('data-playing', 'false')
  })

  const openingNine = () =>
    makeView({
      phase: 'playing',
      lastTurn: {
        seat: 0,
        dice: [5, 4],
        steps: [{ kind: 'opening9', from: 0, to: 53, dice: [5, 4] }],
      },
      turn: { seat: 1, legalMoves: [], deadlineAt: null },
    })

  it('names the opening nine and says why the rule is there at all', () => {
    /* The complaint this whole change answers: a 9 from the start square put
       the pawn on 53 and the only thing on screen was "de la case 0 à la case
       53". The rule that fired now has a name and a reason beside the board. */
    vi.useFakeTimers()
    setup(openingNine(), false)

    act(() => {
      vi.advanceTimersByTime(TUMBLE_MS)
    })
    const card = screen.getByTestId('rule-card')
    expect(card).toHaveAttribute('data-rule', 'opening9')
    expect(card).toHaveTextContent("Le neuf d'ouverture")
    expect(card).toHaveTextContent(/sans cette règle/i)
    expect(card).toHaveTextContent(/finie d'entrée/i)
  })

  it('flies the pawn along the spiral rather than stepping it to fifty three', () => {
    vi.useFakeTimers()
    const { container } = setup(openingNine(), false)

    act(() => {
      vi.advanceTimersByTime(TUMBLE_MS)
    })
    expect(container.querySelector('[data-testid="board-flight"]')).not.toBeNull()
    /* And the button is down for the whole flight, not just for a step of
       four hundred and fifty milliseconds. */
    const roll = screen.getByRole('button', { name: 'Lancer les dés' })
    act(() => {
      vi.advanceTimersByTime(STEP_MS * 2)
    })
    expect(container.querySelector('[data-testid="board-flight"]')).not.toBeNull()
    expect(roll).toBeDisabled()
  })

  it('gives the card back on a click, and the table with it', async () => {
    const { user } = setup(openingNine(), false)
    /* Real timers here: the click is what dismisses the card, and userEvent
       needs a clock that runs. */
    await vi.waitFor(
      () => {
        expect(screen.getByTestId('rule-card')).toBeInTheDocument()
      },
      { timeout: 4000 },
    )
    await user.click(screen.getByTestId('rule-card'))
    expect(screen.queryByTestId('rule-card')).toBeNull()
  })

  it('puts no reading deadline on the card under reduced motion', () => {
    vi.useFakeTimers()
    /* The same chain, but the turn came straight back to this seat, so the
       button is a real question rather than one the server already answered. */
    setup(
      makeView({
        phase: 'playing',
        lastTurn: {
          seat: 0,
          dice: [5, 4],
          steps: [{ kind: 'opening9', from: 0, to: 53, dice: [5, 4] }],
        },
      }),
      true,
    )
    expect(screen.getByTestId('rule-card')).toHaveAttribute('data-rule', 'opening9')
    act(() => {
      vi.advanceTimersByTime(CARD_MS * 4)
    })
    expect(screen.getByTestId('rule-card')).toBeInTheDocument()
    /* And it holds nothing up: the chain is already all on screen, so the
       seat on turn rolls whenever it likes and the card waits to be clicked. */
    expect(screen.getByRole('button', { name: 'Lancer les dés' })).toBeEnabled()
  })
})
