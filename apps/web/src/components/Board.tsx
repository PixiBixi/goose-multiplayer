import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { BOARD_GRID_BREAKPOINT } from '../lib/board-layout.js'
import type { BoardProps } from './board-types.js'
import { BoardGrid } from './BoardGrid.js'
import { BoardSpiral } from './BoardSpiral.js'

export function Board({ seats, highlight }: BoardProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  /* The board lives in a flex column next to a chat rail, so the window width
     says nothing about the room it actually has. A media query would flip the
     renderer on a resize that never touched this element. */
  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  const renderer = width === null ? null : width < BOARD_GRID_BREAKPOINT ? 'grid' : 'spiral'

  return (
    <div className="board" ref={host} data-renderer={renderer ?? 'measuring'}>
      {renderer === 'grid' ? <BoardGrid seats={seats} highlight={highlight} /> : null}
      {renderer === 'spiral' ? <BoardSpiral seats={seats} highlight={highlight} /> : null}
    </div>
  )
}
