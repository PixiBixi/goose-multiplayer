import type { Step } from '@goose/engine'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuleCards } from './useRuleCards.js'

const DWELL = 3000

const chain: Step[] = [
  { kind: 'move', from: 0, to: 6, by: 6 },
  { kind: 'bridge', from: 6, to: 12 },
  { kind: 'double', seat: 0, dice: [3, 3] },
]

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useRuleCards', () => {
  it('shows nothing until the step that fired the rule has played', () => {
    const { result, rerender } = renderHook(
      ({ revealed }: { revealed: number }) =>
        useRuleCards('turn-1', chain, revealed, { dwellMs: DWELL }),
      { initialProps: { revealed: 1 } },
    )
    expect(result.current.current).toBeNull()
    expect(result.current.holds).toBe(false)

    rerender({ revealed: 2 })
    expect(result.current.current?.id).toBe('bridge')
    expect(result.current.holds).toBe(true)
  })

  it('queues the rules one after the other rather than stacking them', () => {
    const { result } = renderHook(() =>
      useRuleCards('turn-1', chain, chain.length, { dwellMs: DWELL }),
    )
    expect(result.current.current?.id).toBe('bridge')

    act(() => {
      vi.advanceTimersByTime(DWELL)
    })
    expect(result.current.current?.id).toBe('double')

    act(() => {
      vi.advanceTimersByTime(DWELL)
    })
    expect(result.current.current).toBeNull()
    expect(result.current.holds).toBe(false)
  })

  it('gives up the card on a click, and moves the queue on', () => {
    const { result } = renderHook(() =>
      useRuleCards('turn-1', chain, chain.length, { dwellMs: DWELL }),
    )
    act(() => {
      result.current.dismiss()
    })
    expect(result.current.current?.id).toBe('double')
  })

  it('does not restart the dwell of the card being read when the next one arrives', () => {
    const { result, rerender } = renderHook(
      ({ revealed }: { revealed: number }) =>
        useRuleCards('turn-1', chain, revealed, { dwellMs: DWELL }),
      { initialProps: { revealed: 2 } },
    )
    expect(result.current.current?.id).toBe('bridge')

    act(() => {
      vi.advanceTimersByTime(DWELL - 400)
    })
    rerender({ revealed: 3 })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    // Still on time: the arrival of the double card must not buy the bridge
    // card another three seconds of the table's attention.
    expect(result.current.current?.id).toBe('double')
  })

  it('starts the queue over when a new turn lands', () => {
    const { result, rerender } = renderHook(
      ({ signature }: { signature: string }) =>
        useRuleCards(signature, chain, chain.length, { dwellMs: DWELL }),
      { initialProps: { signature: 'turn-1' } },
    )
    act(() => {
      vi.advanceTimersByTime(DWELL)
    })
    expect(result.current.current?.id).toBe('double')

    rerender({ signature: 'turn-2' })
    expect(result.current.current?.id).toBe('bridge')
  })

  it('puts no deadline on reading under reduced motion, and holds nothing', () => {
    /* The card is information, not motion. Taking it away after three seconds
       is a reading deadline, and the point of the preference is not to have
       one. It waits for a click instead, and the table is not held up. */
    const { result } = renderHook(() =>
      useRuleCards('turn-1', chain, chain.length, { dwellMs: DWELL, reduced: true }),
    )
    expect(result.current.current?.id).toBe('bridge')
    expect(result.current.holds).toBe(false)

    act(() => {
      vi.advanceTimersByTime(DWELL * 10)
    })
    expect(result.current.current?.id).toBe('bridge')

    act(() => {
      result.current.dismiss()
    })
    expect(result.current.current?.id).toBe('double')
  })
})
