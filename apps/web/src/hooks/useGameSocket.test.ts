import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberedTable } from '../lib/session.js'
import { makeView } from '../test-fixtures.js'

/*
 * A refused rejoin must send the player home: the table is gone, and a stale view of it
 * would sit there with a Roll button that can only fail. The socket is a stub because the
 * claim is about what the client does with what the server says.
 */

const listeners = new Map<string, (...args: unknown[]) => void>()
const emitted: { event: string; payload: unknown }[] = []

const socket = {
  emit: (event: string, payload: unknown) => {
    emitted.push({ event, payload })
  },
  on: (event: string, listener: (...args: unknown[]) => void) => {
    listeners.set(event, listener)
    return socket
  },
  close: () => socket,
}

vi.mock('socket.io-client', () => ({ io: () => socket }))

// Imported after the mock so the hook picks up the stub.
const { useGameSocket } = await import('./useGameSocket.js')

const fire = (event: string, ...args: unknown[]) => {
  act(() => {
    listeners.get(event)?.(...args)
  })
}

beforeEach(() => {
  listeners.clear()
  emitted.length = 0
  window.localStorage.clear()
})

describe('useGameSocket', () => {
  it('goes back home, with the error, when the server refuses a rejoin', () => {
    const { result } = renderHook(() => useGameSocket())
    fire('tableView', makeView({ phase: 'playing' }))
    expect(result.current.view).not.toBeNull()
    expect(rememberedTable()).not.toBeNull()

    fire('error', { code: 'join_failed', message: 'no room with code HKD4P2' })

    expect(result.current.view).toBeNull()
    expect(result.current.error).not.toBeNull()
    expect(rememberedTable()).toBeNull()
  })

  it('keeps the table on an error that is not a refused rejoin', () => {
    const { result } = renderHook(() => useGameSocket())
    fire('tableView', makeView({ phase: 'playing' }))
    fire('error', { code: 'roll_failed', message: 'not your turn' })
    expect(result.current.view).not.toBeNull()
    expect(result.current.error).not.toBeNull()
  })

  it('keeps the chat history and lines the server sends', () => {
    const { result } = renderHook(() => useGameSocket())
    fire('chatHistory', [{ seat: 0, name: 'Ana', text: 'salut', at: 1 }])
    fire('chatLine', { seat: 1, name: 'Ben', text: 'hello', at: 2 })
    expect(result.current.chat.map((line) => line.text)).toEqual(['salut', 'hello'])
  })
})
