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

export function Seat({ seat, isYou, isTurn, isHost }: SeatProps): JSX.Element {
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
        {seat.blocked === 'well' ? <span className="tag warn">{t('seat.blockedWell')}</span> : null}
        {seat.blocked === 'prison' ? (
          <span className="tag warn">{t('seat.blockedPrison')}</span>
        ) : null}
        {seat.skipTurns > 0 ? <span className="tag warn">{t('seat.skip')}</span> : null}
        {seat.presence === 'disconnected' ? (
          <span className="tag warn">{t('seat.disconnected')}</span>
        ) : null}
        {seat.presence === 'left' ? <span className="tag warn">{t('seat.left')}</span> : null}
      </span>
    </li>
  )
}
