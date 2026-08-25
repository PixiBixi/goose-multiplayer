import { describe, expect, it } from 'vitest'
import { type ClientState, initialState, reduce } from './game-reducer.js'

const view = { code: 'HKD4P2', phase: 'lobby' } as never

describe('game-reducer', () => {
  it('starts with no view and a connecting socket', () => {
    expect(initialState).toEqual<ClientState>({ view: null, status: 'connecting', error: null })
  })

  it('stores the view the server sent, without deriving anything from it', () => {
    const next = reduce(initialState, { type: 'view', view })
    expect(next.view).toBe(view)
  })

  it('clears a previous error when a view arrives', () => {
    const errored = reduce(initialState, { type: 'error', error: 'room_full' })
    expect(reduce(errored, { type: 'view', view }).error).toBeNull()
  })

  it('keeps the last view when the socket drops, so the table does not blank', () => {
    const open = reduce(initialState, { type: 'view', view })
    const dropped = reduce(open, { type: 'status', status: 'closed' })
    expect(dropped.view).toBe(view)
    expect(dropped.status).toBe('closed')
  })

  it('drops the table when the seat is given up on purpose', () => {
    const open = reduce(initialState, { type: 'view', view })
    expect(reduce(open, { type: 'left' }).view).toBeNull()
  })

  it('dismisses an error without touching the table', () => {
    const errored = reduce(reduce(initialState, { type: 'view', view }), {
      type: 'error',
      error: 'room_full',
    })
    const cleared = reduce(errored, { type: 'dismiss' })
    expect(cleared.error).toBeNull()
    expect(cleared.view).toBe(view)
  })
})
