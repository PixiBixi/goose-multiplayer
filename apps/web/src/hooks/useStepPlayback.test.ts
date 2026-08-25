import { act, renderHook } from '@testing-library/react'
import type { Step } from '@goose/engine'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStepPlayback } from './useStepPlayback.js'

const chain: Step[] = [
  { kind: 'move', from: 0, to: 5, by: 5 },
  { kind: 'goose', from: 5, to: 10, by: 5 },
  { kind: 'move', from: 10, to: 10, by: 0 },
]

const turn = (steps: Step[]) => ({ seat: 0, dice: [2, 3], steps })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useStepPlayback', () => {
  it('shows nothing when no turn has been resolved yet', () => {
    const { result } = renderHook(() => useStepPlayback(null, { stepMs: 100 }))
    expect(result.current).toEqual({ square: null, index: 0, done: true })
  })

  it('walks one step every stepMs and stops on the last one', () => {
    const { result } = renderHook(() => useStepPlayback(turn(chain), { stepMs: 100 }))
    expect(result.current.square).toBe(5)
    expect(result.current.done).toBe(false)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.square).toBe(10)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.index).toBe(2)
    expect(result.current.done).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.index).toBe(2)
  })

  it('starts over when a new turn arrives', () => {
    const { result, rerender } = renderHook(
      ({ steps }: { steps: Step[] }) => useStepPlayback(turn(steps), { stepMs: 100 }),
      { initialProps: { steps: chain } },
    )
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.index).toBe(1)

    rerender({ steps: [{ kind: 'move', from: 10, to: 14, by: 4 }] })
    expect(result.current.index).toBe(0)
    expect(result.current.square).toBe(14)
  })

  it('does not restart when the same turn arrives again inside a new view', () => {
    const { result, rerender } = renderHook(
      ({ steps }: { steps: Step[] }) => useStepPlayback(turn(steps), { stepMs: 100 }),
      { initialProps: { steps: chain } },
    )
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // A chat message republishes the view with an equal but not identical
    // lastTurn. The chain must not jump back to its first square.
    rerender({ steps: structuredClone(chain) })
    expect(result.current.index).toBe(1)
  })

  it('clamps a goose that overshoots so the pawn never leaves the board', () => {
    const overshoot: Step[] = [
      { kind: 'move', from: 50, to: 59, by: 9 },
      { kind: 'goose', from: 59, to: 68, by: 9 },
      { kind: 'bounce', from: 68, to: 58, overshoot: 5 },
    ]
    const { result } = renderHook(() => useStepPlayback(turn(overshoot), { stepMs: 100 }))
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.square).toBe(63)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.square).toBe(58)
  })
})
