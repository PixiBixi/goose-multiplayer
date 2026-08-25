import type { TableView } from '@goose/protocol'
import type { JSX } from 'react'
import { t } from '../i18n/index.js'
import { SquareIcon } from './SquareIcon.js'

export function GameOver({
  view,
  onRestart,
  onLeave,
}: {
  view: TableView
  onRestart: () => void
  onLeave: () => void
}): JSX.Element {
  const nameOf = (seat: number): string => view.seats[seat]?.name ?? `#${seat + 1}`

  return (
    <section className="panel game-over" data-testid="game-over">
      <h2>
        <SquareIcon name="garden" size={28} /> {t('over.title')}
      </h2>
      <p className="game-over-line">
        {view.winner === null ? t('over.nobody') : t('over.winner', { name: nameOf(view.winner) })}
      </p>

      <h3>{t('over.ranking')}</h3>
      <ol className="ranking">
        {view.ranking.map((seat) => (
          <li key={seat}>
            <span className="pip" style={{ background: view.seats[seat]?.colour }} aria-hidden />
            <span className="seat-name">{nameOf(seat)}</span>
            <span className="seat-where">
              {t('seat.atSquare', { square: view.seats[seat]?.position ?? 0 })}
            </span>
          </li>
        ))}
      </ol>

      <div className="row">
        <button type="button" className="primary" onClick={onRestart}>
          {t('over.again')}
        </button>
        <button type="button" onClick={onLeave}>
          {t('table.leave')}
        </button>
      </div>
    </section>
  )
}
