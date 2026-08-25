import { BOARD_SIZE } from '@goose/engine'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { t } from '../i18n/index.js'
import { pathSquares, spiralPoints } from '../lib/board-layout.js'
import { markFor } from '../lib/square-mark.js'
import { BoardFlight } from './BoardFlight.js'
import { initialOf, pawnsBySquare, type BoardProps } from './board-types.js'
import { SquareIconAt } from './SquareIcon.js'

const SIZE = 600
const CELL_RADIUS = 24
/* The strip under square 1 where pawns that have not entered the board yet
   wait. It sits below the spiral, hence a viewBox taller than it is wide. */
const START_Y = 618
const VIEW_HEIGHT = 640
const GARDEN_RADIUS = CELL_RADIUS * 2.3
const CENTRE = SIZE / 2

export function BoardSpiral({ seats, highlight, flight = null }: BoardProps): JSX.Element {
  const points = useMemo(() => spiralPoints({ size: SIZE, cellRadius: CELL_RADIUS }), [])
  const pawns = pawnsBySquare(seats)
  const garden = markFor(BOARD_SIZE)

  const centreOf = (square: number): { x: number; y: number } =>
    square === BOARD_SIZE
      ? { x: CENTRE, y: CENTRE }
      : (points[square - 1] ?? { x: CENTRE, y: START_Y })

  /* The route a flight follows, square centre by square centre: the real
     spiral, not a straight line across the board between two squares that
     happen to sit near each other on the page. */
  const flier = flight === null ? null : seats.find((seat) => seat.seat === flight.seat)
  const route = flight === null ? [] : pathSquares(flight.from, flight.to).map(centreOf)

  return (
    <svg
      className="board-svg"
      data-testid="board-spiral"
      viewBox={`0 0 ${SIZE} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={t('board.aria')}
    >
      {/* The track under the squares: one thick blue band, printed once. */}
      <path
        d={`${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} L${CENTRE},${CENTRE}`}
        fill="none"
        stroke="var(--blue)"
        strokeWidth={CELL_RADIUS * 2 + 14}
        strokeLinecap="square"
        strokeLinejoin="round"
        opacity={0.18}
      />

      {/* le Jardin, the centre medallion. Square 63 is not on the spiral. */}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={GARDEN_RADIUS}
        fill="var(--square-garden)"
        stroke="var(--ink)"
        strokeWidth={2}
      />
      <SquareIconAt
        name="garden"
        x={CENTRE}
        y={CENTRE - GARDEN_RADIUS * 0.24}
        size={GARDEN_RADIUS * 0.66}
        colour="var(--on-garden)"
        strokeWidth={2.4}
      />
      <text
        x={CENTRE}
        y={CENTRE + GARDEN_RADIUS * 0.46}
        textAnchor="middle"
        fontFamily="var(--display)"
        fontSize={GARDEN_RADIUS * 0.38}
        fill="var(--on-garden)"
      >
        {BOARD_SIZE}
      </text>
      <title>{garden.label}</title>

      {points.map((point) => {
        const mark = markFor(point.n)
        return (
          <g key={point.n} data-square={point.n}>
            <title>{mark.label}</title>
            <circle
              cx={point.x}
              cy={point.y}
              r={CELL_RADIUS}
              fill={`var(--square-${mark.tone})`}
              stroke="var(--ink)"
              strokeWidth={2}
            />
            {mark.icon ? (
              <>
                <SquareIconAt
                  name={mark.icon}
                  x={point.x}
                  y={point.y - CELL_RADIUS * 0.18}
                  size={CELL_RADIUS * 1.05}
                  colour={`var(--on-${mark.tone})`}
                  strokeWidth={2.2}
                />
                <text
                  x={point.x}
                  y={point.y + CELL_RADIUS * 0.82}
                  textAnchor="middle"
                  fontFamily="var(--data)"
                  fontWeight={700}
                  fontSize={CELL_RADIUS * 0.44}
                  fill={`var(--on-${mark.tone})`}
                >
                  {point.n}
                </text>
              </>
            ) : (
              <text
                x={point.x}
                y={point.y + CELL_RADIUS * 0.26}
                textAnchor="middle"
                fontFamily="var(--display)"
                fontSize={CELL_RADIUS * 0.7}
                fill={`var(--on-${mark.tone})`}
              >
                {point.n}
              </text>
            )}
          </g>
        )
      })}

      {highlight !== null ? (
        <circle
          className="board-highlight"
          cx={centreOf(highlight).x}
          cy={centreOf(highlight).y}
          r={(highlight === BOARD_SIZE ? GARDEN_RADIUS : CELL_RADIUS) + 7}
          fill="none"
          stroke="var(--pink)"
          strokeWidth={4}
        />
      ) : null}

      {/* Alongside the waiting pawns, not under square 1: square 1 sits at the
          very bottom of the spiral and the caption ran straight through it. */}
      <text
        x={8}
        y={START_Y + 5}
        textAnchor="start"
        fontFamily="var(--body)"
        fontSize={15}
        letterSpacing="0.1em"
        fill="var(--dim)"
      >
        {t('board.start').toUpperCase()}
      </text>

      {[...pawns].flatMap(([square, sitting]) =>
        sitting.map((seat, slot) => {
          /* The seat in the air is drawn by the flight, not here: two copies
             of the same pawn, one already parked on the destination, would
             give the arrival away before the pawn had left. */
          if (flight !== null && seat.seat === flight.seat) return null
          const base = centreOf(square)
          const angle = (-90 + slot * 58) * (Math.PI / 180)
          const offset = square === 0 ? CELL_RADIUS * 1.2 : CELL_RADIUS + 4
          const x =
            square === 0
              ? CENTRE + (slot - (sitting.length - 1) / 2) * 34
              : base.x + Math.cos(angle) * offset
          const y = square === 0 ? START_Y : base.y + Math.sin(angle) * offset
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
                r={CELL_RADIUS * 0.56}
                fill={seat.colour}
                stroke="var(--ink)"
                strokeWidth={2}
                opacity={seat.presence === 'active' ? 1 : 0.55}
              />
              <text
                y={CELL_RADIUS * 0.2}
                textAnchor="middle"
                fontFamily="var(--display)"
                fontSize={CELL_RADIUS * 0.54}
                fill="var(--paper-raised)"
              >
                {initialOf(seat.name)}
              </text>
            </g>
          )
        }),
      )}

      {flight !== null && flier ? (
        <BoardFlight
          /* Remounted per flight: the component owns a clock, and a new route
             has to start it over rather than carry on from where the last one
             got to. */
          key={`${String(flight.seat)}:${String(flight.from)}:${String(flight.to)}`}
          points={route}
          colour={flier.colour}
          initial={initialOf(flier.name)}
          radius={CELL_RADIUS * 0.56}
          durationMs={flight.durationMs}
          label={`${flier.name}: ${t('seat.atSquare', { square: flight.to })}`}
        />
      ) : null}
    </svg>
  )
}
