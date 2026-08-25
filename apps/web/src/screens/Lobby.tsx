import { MIN_SEATS } from '@goose/engine'
import type { TableConfig } from '@goose/engine'
import type { TableView } from '@goose/protocol'
import type { JSX } from 'react'
import { RoomCode } from '../components/RoomCode.js'
import { TableRulesPanel } from '../components/TableRulesPanel.js'
import { t } from '../i18n/index.js'

export type LobbyProps = {
  view: TableView
  onConfigure: (patch: Partial<TableConfig>) => void
  onStart: () => void
  onLeave: () => void
}

export function Lobby({ view, onConfigure, onStart, onLeave }: LobbyProps): JSX.Element {
  const isHost = view.you.seat === view.host
  const seated = view.seats.filter((seat) => seat.presence !== 'left')
  const enough = seated.length >= MIN_SEATS

  return (
    <div className="lobby">
      <section className="panel stack">
        <h2>{t('lobby.title')}</h2>
        <RoomCode code={view.code} />

        <h3>{t('lobby.players')}</h3>
        <ul className="seat-list">
          {view.seats.map((seat) => (
            <li key={seat.seat}>
              <span className="pip" style={{ background: seat.colour }} aria-hidden="true" />
              <span className="seat-name">{seat.name}</span>
              {seat.seat === view.host ? <span className="tag">{t('lobby.host')}</span> : null}
              {seat.seat === view.you.seat ? <span className="tag">{t('lobby.you')}</span> : null}
              {seat.presence === 'disconnected' ? (
                <span className="tag warn">{t('seat.disconnected')}</span>
              ) : null}
              {seat.presence === 'left' ? <span className="tag warn">{t('seat.left')}</span> : null}
            </li>
          ))}
        </ul>

        <div className="row">
          {isHost ? (
            <button type="button" className="primary" onClick={onStart} disabled={!enough}>
              {t('lobby.start')}
            </button>
          ) : (
            <p className="hint">{t('lobby.waitingHost')}</p>
          )}
          <button type="button" onClick={onLeave}>
            {t('table.leave')}
          </button>
        </div>
        {isHost && !enough ? <p className="hint">{t('lobby.needMore')}</p> : null}
      </section>

      <TableRulesPanel config={view.config} canEdit={isHost} onChange={onConfigure} />
    </div>
  )
}
