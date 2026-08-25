import type { SeatView } from '@goose/protocol'
import type { JSX } from 'react'
import { t } from '../i18n/index.js'
import { initialOf } from './board-types.js'

export type SeatProps = {
  seat: SeatView
  isYou: boolean
  isTurn: boolean
  isHost: boolean
}

/* What the plate says about a seat in the well or the prison. The countdown is
   half the fix: a player looking at a stuck pawn with no idea whether they
   will ever play again is the experience being repaired here. Everything it
   needs is in the view, computed by the server; nothing is worked out from
   the rules. */
function trapLabel(seat: SeatView): string | null {
  if (seat.blocked === null) return null
  const trap = t(seat.blocked === 'well' ? 'seat.blockedWell' : 'seat.blockedPrison')
  const turns = seat.blockedTurnsLeft
  if (turns === null) return trap
  /* Trying, not waiting: at a table that plays the freeing double the seat
     rolls for its own way out, and the plate says so. */
  const key = seat.blockedTrying
    ? turns === 1
      ? 'seat.blockedTryOne'
      : 'seat.blockedTryMany'
    : turns === 1
      ? 'seat.blockedWaitOne'
      : 'seat.blockedWaitMany'
  return t(key, { trap, turns })
}

export function Seat({ seat, isYou, isTurn, isHost }: SeatProps): JSX.Element {
  const trap = trapLabel(seat)
  return (
    <li className="seat" data-turn={isTurn} data-seat={seat.seat}>
      <span className="seat-badge" style={{ background: seat.colour }} aria-hidden="true">
        {initialOf(seat.name)}
      </span>
      <span className="seat-body">
        <span className="seat-name">{seat.name}</span>
        <span className="seat-where">
          {seat.position === 0 ? t('seat.atStart') : t('seat.atSquare', { square: seat.position })}
        </span>
      </span>
      <span className="seat-tags">
        {isTurn ? <span className="tag turn">{t('table.yourTurn')}</span> : null}
        {isHost ? <span className="tag">{t('lobby.host')}</span> : null}
        {isYou ? <span className="tag">{t('lobby.you')}</span> : null}
        {trap === null ? null : (
          <span className="tag warn" data-testid="seat-blocked">
            {trap}
          </span>
        )}
        {seat.skipTurns > 0 ? <span className="tag warn">{t('seat.skip')}</span> : null}
        {seat.presence === 'disconnected' ? (
          <span className="tag warn">{t('seat.disconnected')}</span>
        ) : null}
        {seat.presence === 'left' ? <span className="tag warn">{t('seat.left')}</span> : null}
      </span>
    </li>
  )
}
