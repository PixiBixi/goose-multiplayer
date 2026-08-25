import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { SeatView, TableView } from '@goose/protocol'
import { Board } from '../components/Board.js'
import { ChatPanel } from '../components/ChatPanel.js'
import { Die } from '../components/Die.js'
import { GameOver } from '../components/GameOver.js'
import { Seat } from '../components/Seat.js'
import { SquareIcon } from '../components/SquareIcon.js'
import type { Tone } from '../lib/square-mark.js'
import { turnSignature, useStepPlayback } from '../hooks/useStepPlayback.js'
import { t } from '../i18n/index.js'
import { describeStep } from '../lib/describe-step.js'

/* Slow enough that a goose chain reads as three separate hops, quick enough
   that a five step chain does not hold the table for ten seconds. */
const STEP_MS = 650

const LEGEND: Array<{ tone: Tone; icon: 'goose' | 'bridge' | 'well' | 'skull' | 'garden' }> = [
  { tone: 'goose', icon: 'goose' },
  { tone: 'move', icon: 'bridge' },
  { tone: 'trap', icon: 'well' },
  { tone: 'death', icon: 'skull' },
  { tone: 'garden', icon: 'garden' },
]

export type TableProps = {
  view: TableView
  onRoll: () => void
  onChat: (text: string) => void
  onRestart: () => void
  onLeave: () => void
}

export function Table({ view, onRoll, onChat, onRestart, onLeave }: TableProps): JSX.Element {
  const playback = useStepPlayback(view.lastTurn, { stepMs: STEP_MS })
  const names = view.seats.map((seat) => seat.name)
  const signature = turnSignature(view.lastTurn)

  /* The view only ever carries the last turn, so the feed is kept here. It
     stores what the server narrated, it never re-derives a chain. */
  const [log, setLog] = useState<string[]>([])
  useEffect(() => {
    if (view.lastTurn === null) {
      setLog([])
      return
    }
    const roller = view.seats[view.lastTurn.seat]?.name ?? ''
    const total = view.lastTurn.dice.reduce((a, b) => a + b, 0)
    const lines = [
      t('table.rolled', { name: roller, total }),
      ...view.lastTurn.steps.map((step) => describeStep(step, names)),
    ]
    setLog((previous) => [...previous, ...lines].slice(-60))
    /* Keyed on the signature alone, deliberately: the same turn republished
       inside a new view (a chat message, a rule change) must not append the
       same chain twice. */
  }, [signature])

  /* While the chain plays, the seat that rolled stands on the square the
     chain is on rather than on the square it ends on. The square comes from
     the server's own steps, already clamped; nothing is recomputed. */
  const seats: SeatView[] = useMemo(() => {
    const moving = view.lastTurn?.seat
    if (moving === undefined || playback.done || playback.square === null) return view.seats
    return view.seats.map((seat) =>
      seat.seat === moving ? { ...seat, position: playback.square as number } : seat,
    )
  }, [view.seats, view.lastTurn?.seat, playback.done, playback.square])

  const yourTurn = view.turn.seat === view.you.seat
  const canRoll = view.turn.legalMoves.includes('roll') && playback.done
  const you = view.seats[view.you.seat]

  return (
    <div className="table">
      <div className="table-board">
        <Board seats={seats} highlight={playback.square} />
        <p className="legend">
          {LEGEND.map((entry) => (
            <span key={entry.tone}>
              <span className="swatch" style={{ background: `var(--square-${entry.tone})` }} />
              <SquareIcon name={entry.icon} size={15} />
              {t(`legend.${entry.tone}`)}
            </span>
          ))}
        </p>
      </div>

      <div className="table-rail">
        <section className="panel stack turn-panel">
          <h2>
            {yourTurn
              ? t('table.yourTurn')
              : t('table.turnOf', { name: view.seats[view.turn.seat]?.name ?? '' })}
          </h2>
          <div className="row">
            {(view.lastTurn?.dice ?? []).map((value, index) => (
              <Die key={`${signature}-${index}`} value={value} />
            ))}
            <button type="button" className="primary" onClick={onRoll} disabled={!canRoll}>
              {t('table.roll')}
            </button>
          </div>
          {you && you.blocked !== null ? <p className="hint">{t('table.blockedYou')}</p> : null}
          <p className="hint code-line">{view.code}</p>
        </section>

        {view.phase === 'over' ? (
          <GameOver view={view} onRestart={onRestart} onLeave={onLeave} />
        ) : null}

        <section className="panel stack">
          <h3>{t('table.seats')}</h3>
          <ul className="seat-list">
            {view.seats.map((seat) => (
              <Seat
                key={seat.seat}
                seat={seat}
                isYou={seat.seat === view.you.seat}
                isTurn={seat.seat === view.turn.seat && view.phase === 'playing'}
                isHost={seat.seat === view.host}
              />
            ))}
          </ul>
        </section>

        <section className="panel stack">
          <h3>{t('table.log')}</h3>
          <ol className="turn-log">
            {log.length === 0 ? <li className="hint">{t('table.logEmpty')}</li> : null}
            {log.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        </section>

        <ChatPanel lines={view.chat} onSend={onChat} />

        <div className="row">
          <button type="button" onClick={onLeave}>
            {t('table.leave')}
          </button>
        </div>
      </div>
    </div>
  )
}
