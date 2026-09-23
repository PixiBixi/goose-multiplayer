import type { Square } from '@goose/engine'
import type { SeatView } from '@goose/protocol'
import type { JSX } from 'react'
import { t } from '../i18n/index.js'
import type { Coords } from '../lib/board-layout.js'
import { BoardFlight } from './BoardFlight.js'
import { initialOf, pawnsBySquare, type Flight } from './board-types.js'

export type PawnsProps = {
  seats: SeatView[]
  flight: Flight | null
  /** Screen position for the slot-th of count seats sharing a square. */
  positionOf: (square: Square, slot: number, count: number) => Coords
  /** Pawn circle radius. Also the radius BoardFlight draws its comet at. */
  radius: number
  /** y-offset and size of the seat initial inside the pawn circle. */
  textY: number
  fontSize: number
  /** The flight's route, square centre by square centre, already resolved
      by the board: the grid and the spiral turn a square into a point of
      their own, this component only draws what it is handed. */
  route: Coords[]
}

/** The parked pawns and the one in the air, shared by BoardGrid and
    BoardSpiral: only the geometry (positionOf, radius, route) differs
    between a grid and a spiral. */
export function Pawns({
  seats,
  flight,
  positionOf,
  radius,
  textY,
  fontSize,
  route,
}: PawnsProps): JSX.Element {
  const pawns = pawnsBySquare(seats)
  const flier = flight === null ? null : (seats.find((seat) => seat.seat === flight.seat) ?? null)

  return (
    <>
      {[...pawns].flatMap(([square, sitting]) =>
        sitting.map((seat, slot) => {
          /* The seat in the air is drawn by the flight, not here: two copies
             of the same pawn, one already parked on the destination, would
             give the arrival away before the pawn had left. */
          if (flight !== null && seat.seat === flight.seat) return null
          const { x, y } = positionOf(square, slot, sitting.length)
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
                r={radius}
                fill={seat.colour}
                stroke="var(--ink)"
                strokeWidth={2}
                opacity={seat.presence === 'active' ? 1 : 0.55}
              />
              <text
                y={textY}
                textAnchor="middle"
                fontFamily="var(--display)"
                fontSize={fontSize}
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
          radius={radius}
          durationMs={flight.durationMs}
          label={`${flier.name}: ${t('seat.atSquare', { square: flight.to })}`}
        />
      ) : null}
    </>
  )
}
