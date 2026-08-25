import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiceTumble } from './useDiceTumble.js'

const OPTS = { tumbleMs: 900, frameMs: 90, reduced: false }

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDiceTumble', () => {
  it('has no face to show before anything has been rolled', () => {
    const { result } = renderHook(() => useDiceTumble('', null, OPTS))
    expect(result.current).toEqual({ faces: [], settled: true })
  })

  it('holds the real values back for the whole tumble, then lands on them', () => {
    const { result } = renderHook(() => useDiceTumble('t1', [6, 6], OPTS))

    // The values the server sent must not be readable while it spins: a
    // screenshot taken mid-animation would otherwise give the answer away.
    expect(result.current.settled).toBe(false)
    const seen: string[] = []
    for (let frame = 0; frame < 10; frame++) {
      expect(result.current.faces).toHaveLength(2)
      expect(result.current.settled).toBe(false)
      seen.push(result.current.faces.join('-'))
      act(() => {
        vi.advanceTimersByTime(90)
      })
    }

    expect(result.current).toEqual({ faces: [6, 6], settled: true })
    // And it actually tumbled rather than sitting on one face for 900ms.
    expect(new Set(seen).size).toBeGreaterThan(1)
  })

  it('shows the result at once when the viewer asked for less motion', () => {
    const { result } = renderHook(() => useDiceTumble('t1', [2, 5], { ...OPTS, reduced: true }))
    expect(result.current).toEqual({ faces: [2, 5], settled: true })
  })

  it('tumbles again when a new turn arrives', () => {
    const { result, rerender } = renderHook(
      ({ key, dice }: { key: string; dice: number[] }) => useDiceTumble(key, dice, OPTS),
      { initialProps: { key: 't1', dice: [6, 6] } },
    )
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.settled).toBe(true)

    rerender({ key: 't2', dice: [1, 4] })
    expect(result.current.settled).toBe(false)
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.faces).toEqual([1, 4])
  })

  it('does not restart when the same turn arrives again inside a new view', () => {
    const { result, rerender } = renderHook(
      ({ key, dice }: { key: string; dice: number[] }) => useDiceTumble(key, dice, OPTS),
      { initialProps: { key: 't1', dice: [3, 3] } },
    )
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.settled).toBe(true)

    // A chat message republishes the view with an equal but not identical
    // lastTurn. The dice must not start spinning again.
    rerender({ key: 't1', dice: [3, 3] })
    expect(result.current).toEqual({ faces: [3, 3], settled: true })
  })
})
