import { DEFAULT_CONFIG } from '@goose/engine'
import type { SeatView, TableView } from '@goose/protocol'

const COLOURS = ['#e63946', '#2a9d8f', '#457b9d', '#f4a261', '#8338ec', '#ffb703']

export function makeSeat(seat: number, patch: Partial<SeatView> = {}): SeatView {
  return {
    seat,
    name: ['Jérémy', 'Claire', 'Malo', 'Anouk', 'Théo', 'Lise'][seat] ?? `Seat ${seat}`,
    presence: 'active',
    position: 0,
    blocked: null,
    skipTurns: 0,
    colour: COLOURS[seat] ?? '#000000',
    ...patch,
  }
}

export function makeView(patch: Partial<TableView> = {}): TableView {
  const seats = patch.seats ?? [makeSeat(0), makeSeat(1)]
  return {
    code: 'HKD4P2',
    phase: 'lobby',
    config: { ...DEFAULT_CONFIG },
    you: { seat: 0, name: seats[0]?.name ?? 'Jérémy' },
    host: 0,
    seats,
    turn: { seat: 0, legalMoves: ['roll'], deadlineAt: null },
    lastTurn: null,
    winner: null,
    ranking: [],
    chat: [],
    ...patch,
  }
}
