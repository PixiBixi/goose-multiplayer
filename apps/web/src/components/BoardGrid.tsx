import { BOARD_SIZE } from '@goose/engine'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { t } from '../i18n/index.js'
import { gridCells, gridSize } from '../lib/board-layout.js'
import { markFor } from '../lib/square-mark.js'
import { initialOf, pawnsBySquare, type BoardProps } from './board-types.js'
import { SquareIconAt } from './SquareIcon.js'

/* Seven columns is what fits a phone at a readable 46px per square without
   the numbers shrinking below legibility. */
const LAYOUT = { cols: 7, cell: 46, gap: 5 }
/** The strip under the grid where pawns that have not entered yet wait. */
const START_STRIP = 40

export function BoardGrid({ seats, highlight }: BoardProps): JSX.Element {
  const cells = useMemo(() => gridCells(LAYOUT), [])
  const { width, height } = gridSize(LAYOUT)
  const pawns = pawnsBySquare(seats)
  const half = LAYOUT.cell / 2

  const centreOf = (square: number): { x: number; y: number } => {
    const cell = cells[square - 1]
    if (!cell) return { x: width / 2, y: height + START_STRIP / 2 }
    return { x: cell.x + half, y: cell.y + half }
  }

  return (
    <svg
      className="board-svg"
      data-testid="board-grid"
      viewBox={`0 0 ${width} ${height + START_STRIP}`}
      role="img"
      aria-label={t('board.aria')}
    >
      {cells.map((cell) => {
        const mark = markFor(cell.n)
        const cx = cell.x + half
        const cy = cell.y + half
        return (
          <g key={cell.n} data-square={cell.n}>
            <title>{mark.label}</title>
            <rect
              x={cell.x}
              y={cell.y}
              width={cell.w}
              height={cell.h}
              fill={`var(--square-${mark.tone})`}
              stroke="var(--ink)"
              strokeWidth={2}
            />
            {mark.icon ? (
              <>
                <SquareIconAt
                  name={mark.icon}
                  x={cx}
                  y={cy - half * 0.24}
                  size={half * 1.05}
                  colour={`var(--on-${mark.tone})`}
                  strokeWidth={2.2}
                />
                <text
                  x={cx}
                  y={cy + half * 0.86}
                  textAnchor="middle"
                  fontFamily="var(--data)"
                  fontWeight={700}
                  fontSize={half * 0.46}
                  fill={`var(--on-${mark.tone})`}
                >
                  {cell.n}
                </text>
              </>
            ) : (
              <text
                x={cx}
                y={cy + half * 0.28}
                textAnchor="middle"
                fontFamily="var(--display)"
                fontSize={half * 0.72}
                fill={`var(--on-${mark.tone})`}
              >
                {cell.n}
              </text>
            )}
          </g>
        )
      })}

      {highlight !== null ? (
        <rect
          className="board-highlight"
          x={centreOf(highlight).x - half - 3}
          y={centreOf(highlight).y - half - 3}
          width={LAYOUT.cell + 6}
          height={LAYOUT.cell + 6}
          fill="none"
          stroke="var(--pink)"
          strokeWidth={4}
        />
      ) : null}

      {[...pawns].flatMap(([square, sitting]) =>
        sitting.map((seat, slot) => {
          const base = centreOf(square)
          const spread = (slot - (sitting.length - 1) / 2) * (half * 0.62)
          const x = square === 0 ? width / 2 + spread * 2 : base.x + spread
          const y = square === 0 ? height + START_STRIP / 2 : base.y + half * 0.5
          return (
            /* Keyed by seat, not by square: React then moves the same node
               from one square to the next and the CSS transition has
               something to animate. Keyed by square it is destroyed and
               rebuilt, and the pawn teleports. */
            <g
              key={seat.seat}
              className="pawn"
              data-pawn={seat.seat}
              transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`}
            >
              <title>{`${seat.name}: ${square === 0 ? t('seat.atStart') : t('seat.atSquare', { square })}`}</title>
              <circle
                r={half * 0.48}
                fill={seat.colour}
                stroke="var(--ink)"
                strokeWidth={2}
                opacity={seat.presence === 'active' ? 1 : 0.55}
              />
              <text
                y={half * 0.18}
                textAnchor="middle"
                fontFamily="var(--display)"
                fontSize={half * 0.48}
                fill="var(--paper-raised)"
              >
                {initialOf(seat.name)}
              </text>
            </g>
          )
        }),
      )}

      <text
        x={4}
        y={height + START_STRIP - 8}
        fontFamily="var(--body)"
        fontSize={11}
        letterSpacing="0.1em"
        fill="var(--dim)"
      >
        {t('board.start').toUpperCase()}
      </text>
      <desc>{`${BOARD_SIZE} cases`}</desc>
    </svg>
  )
}
