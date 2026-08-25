import { DEFAULT_CONFIG, createGame } from '@goose/engine'
import { describe, expect, it } from 'vitest'
import { APP_VERSION } from './version.js'
import { buildView } from './views.js'

const members = [
  { name: 'Alice', sessionId: 's0', presence: 'active' as const },
  { name: 'Bob', sessionId: 's1', presence: 'active' as const },
]

describe('buildView', () => {
  it('shows no legal move and an empty ranking before the game starts', () => {
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'lobby',
        config: DEFAULT_CONFIG,
        hostSeat: 0,
        members,
        game: null,
        lastTurn: null,
        chat: [],
      },
      1,
    )
    expect(view.turn.legalMoves).toEqual([])
    expect(view.ranking).toEqual([])
    expect(view.winner).toBeNull()
    expect(view.seats.map((s) => s.position)).toEqual([0, 0])
  })

  it('projects the seat on turn and its legal moves once the game is running', () => {
    const game = createGame(2, DEFAULT_CONFIG)
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'playing',
        config: DEFAULT_CONFIG,
        hostSeat: 0,
        members,
        game,
        lastTurn: null,
        chat: [],
      },
      0,
    )
    expect(view.turn.seat).toBe(0)
    expect(view.turn.legalMoves).toEqual(['roll'])
  })

  it('counts down the turns a blocked seat has left, so no plate has to', () => {
    const game = { ...createGame(2), blocked: ['well' as const, null], blockedTurns: [1, 0] }
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'playing',
        config: game.config,
        hostSeat: 0,
        members,
        game,
        lastTurn: null,
        chat: [],
      },
      0,
    )
    expect(view.seats[0]?.blockedTurnsLeft).toBe(2)
    /* Trying, not waiting: the default table hands the blocked seat its roll. */
    expect(view.seats[0]?.blockedTrying).toBe(true)
    expect(view.seats[1]?.blockedTurnsLeft).toBeNull()
    expect(view.seats[1]?.blockedTrying).toBe(false)
  })

  it('counts down nothing at a table where only a rescue opens the trap', () => {
    const game = {
      ...createGame(2, { maxBlockedTurns: null, escapeOnDouble: false }),
      blocked: ['well' as const, null],
    }
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'playing',
        config: game.config,
        hostSeat: 0,
        members,
        game,
        lastTurn: null,
        chat: [],
      },
      0,
    )
    expect(view.seats[0]?.blockedTurnsLeft).toBeNull()
    expect(view.seats[0]?.blockedTrying).toBe(false)
  })

  it('offers no legal move to a seat that is not on turn', () => {
    const game = createGame(2, DEFAULT_CONFIG)
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'playing',
        config: DEFAULT_CONFIG,
        hostSeat: 0,
        members,
        game,
        lastTurn: null,
        chat: [],
      },
      1,
    )
    expect(view.turn.legalMoves).toEqual([])
  })

  it('passes the chat log through untouched', () => {
    const chat = [{ seat: 0, name: 'Alice', text: 'salut', at: 1 }]
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'lobby',
        config: DEFAULT_CONFIG,
        hostSeat: 0,
        members,
        game: null,
        lastTurn: null,
        chat,
      },
      0,
    )
    expect(view.chat).toBe(chat)
  })

  it('refuses to build a view for a seat with no member', () => {
    expect(() =>
      buildView(
        {
          code: 'ABCDEF',
          phase: 'lobby',
          config: DEFAULT_CONFIG,
          hostSeat: 0,
          members,
          game: null,
          lastTurn: null,
          chat: [],
        },
        5,
      ),
    ).toThrow()
  })

  /* The tab on the other end compares this with the version its own bundle was
     built as. Every view carries it, not just the first: a tab that reconnects
     into a room after a deploy has to be told too. */
  it('stamps the version the server is running into the view', () => {
    const view = buildView(
      {
        code: 'ABCDEF',
        phase: 'lobby',
        config: DEFAULT_CONFIG,
        hostSeat: 0,
        members,
        game: null,
        lastTurn: null,
        chat: [],
      },
      0,
    )
    expect(view.version).toBe(APP_VERSION)
    expect(view.version.length).toBeGreaterThan(0)
  })
})
