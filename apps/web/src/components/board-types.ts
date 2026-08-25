import type { Seat, Square } from '@goose/engine'
import type { SeatView } from '@goose/protocol'

/* A pawn crossing the board along the printed track instead of stepping one
   square at a time. Which steps earn one is the engine's call, read off the
   step kind in describe-step.ts; the board only draws what it is handed. */
export type Flight = {
  seat: Seat
  from: Square
  to: Square
  durationMs: number
}

export type BoardProps = {
  seats: SeatView[]
  /** The square the resolution chain is standing on right now, or null. */
  highlight: Square | null
  /** The pawn in the air, or null when nobody is flying. */
  flight?: Flight | null
}

/** Seats sharing a square, in seat order, so a crowded square still reads. */
export function pawnsBySquare(seats: SeatView[]): Map<Square, SeatView[]> {
  const map = new Map<Square, SeatView[]>()
  for (const seat of seats) {
    if (seat.presence === 'left') continue
    const at = map.get(seat.position)
    if (at) at.push(seat)
    else map.set(seat.position, [seat])
  }
  return map
}

export function initialOf(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? '?'
}
