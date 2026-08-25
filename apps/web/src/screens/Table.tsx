import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { SeatView, TableView } from '@goose/protocol'
import { Board } from '../components/Board.js'
import { ChatPanel } from '../components/ChatPanel.js'
import { Die } from '../components/Die.js'
import type { DieState } from '../components/Die.js'
import { GameOver } from '../components/GameOver.js'
import { Seat } from '../components/Seat.js'
import { SquareIcon } from '../components/SquareIcon.js'
import type { Tone } from '../lib/square-mark.js'
import { useDiceTumble } from '../hooks/useDiceTumble.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
import { turnSignature, useStepPlayback } from '../hooks/useStepPlayback.js'
import { t } from '../i18n/index.js'
import { describeStep } from '../lib/describe-step.js'

/* Slow enough that a goose chain reads as two separate hops and a bounce
   reads as going backwards, quick enough that a six step chain does not hold
   the table for four seconds. */
const STEP_MS = 450

/* The tumble. Long enough to register as a throw, short enough that the
   player is not waiting on it, and the frame rate is the face changing, not
   the browser painting. */
const TUMBLE_MS = 900
const TUMBLE_FRAME_MS = 90

/* How long the roll button stays down waiting for the view that answers a
   roll. A safety net, not the mechanism: the answer normally lands in
   milliseconds and clears it. Without it, a roll the server refuses would
   leave the seat holding a dead button. */
const ROLL_ACK_MS = 4000

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

type LogLine = { id: string; text: string }

export function Table({ view, onRoll, onChat, onRestart, onLeave }: TableProps): JSX.Element {
  const reduced = usePrefersReducedMotion()
  const names = view.seats.map((seat) => seat.name)
  const signature = turnSignature(view.lastTurn)

  /* The dice first, then the walk. Nothing downstream may start before the
     tumble settles, or the chain narrates the answer while the dice are
     still spinning it. */
  const tumble = useDiceTumble(signature, view.lastTurn?.dice ?? null, {
    tumbleMs: TUMBLE_MS,
    frameMs: TUMBLE_FRAME_MS,
    reduced,
  })
  const playback = useStepPlayback(view.lastTurn, {
    stepMs: STEP_MS,
    enabled: tumble.settled,
    reduced,
  })
  /* Down from the click, not from the server's answer: the view takes a round
     trip to come back, and a second click inside that window is a second roll
     the server refuses with an error banner. */
  const [sentFor, setSentFor] = useState<string | null>(null)
  const awaitingRoll = sentFor !== null && sentFor === signature
  useEffect(() => {
    if (!awaitingRoll) return
    const timer = setTimeout(() => {
      setSentFor(null)
    }, ROLL_ACK_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [awaitingRoll])

  const playing = awaitingRoll || (view.lastTurn !== null && (!tumble.settled || !playback.done))

  /* The view only ever carries the last turn, so the feed is kept here. It
     stores what the server narrated, it never re-derives a chain, and a line
     appears when its own step plays rather than the whole chain landing at
     once. */
  const [log, setLog] = useState<LogLine[]>([])
  const revealed = tumble.settled ? playback.played : 0
  useEffect(() => {
    const turn = view.lastTurn
    if (turn === null) {
      setLog([])
      return
    }
    if (revealed === 0) return
    const roller = view.seats[turn.seat]?.name ?? ''
    const total = turn.dice.reduce((a, b) => a + b, 0)
    const lines: LogLine[] = [
      { id: `${signature}#roll`, text: t('table.rolled', { name: roller, total }) },
      ...turn.steps.slice(0, revealed).map((step, index) => ({
        id: `${signature}#${String(index)}`,
        text: describeStep(step, names),
      })),
    ]
    /* Keyed on the signature and the count, deliberately: the same turn
       republished inside a new view (a chat message, a rule change) must not
       append the same chain twice, and every line carries its own identity. */
    setLog((previous) => {
      const seen = new Set(previous.map((line) => line.id))
      const added = lines.filter((line) => !seen.has(line.id))
      if (added.length === 0) return previous
      return [...previous, ...added].slice(-60)
    })
  }, [signature, revealed])

  /* While the chain plays, the seat that rolled stands on the square the
     chain is on rather than on the square it ends on. The square comes from
     the server's own steps, already clamped; nothing is recomputed.

     Every panel that shows a position reads this, not view.seats: the seat
     list saying "Case 7" while the dice are still spinning gives the roll
     away just as plainly as the faces would. */
  const seats: SeatView[] = useMemo(() => {
    const turn = view.lastTurn
    if (turn === null || playback.done || playback.square === null) return view.seats
    /* What holds the roller is taken off the steps that have actually played,
       so "Au puits" appears when the pawn falls in and not while the dice are
       still in the air. Still the server's account, only less of it. */
    const played = turn.steps.slice(0, playback.played)
    const held = played.find((step) => step.kind === 'blocked' && step.seat === turn.seat)
    const waits = played.reduce(
      (total, step) =>
        step.kind === 'skip' && step.seat === turn.seat ? total + step.turns : total,
      0,
    )
    return view.seats.map((seat) =>
      seat.seat === turn.seat
        ? {
            ...seat,
            position: playback.square as number,
            blocked: held?.kind === 'blocked' ? held.reason : null,
            skipTurns: waits,
          }
        : seat,
    )
  }, [view.seats, view.lastTurn, playback.done, playback.played, playback.square])

  const yourTurn = view.turn.seat === view.you.seat
  /* Disabled for the whole sequence, dice and walk together: a second roll
     fired mid-chain would land a new turn on top of the one still playing. */
  const canRoll = view.turn.legalMoves.includes('roll') && !playing
  const you = seats[view.you.seat]

  /* Idle dice show no face at all. Before anyone has rolled there is no
     result, and drawing two printed faces under a button that says "lancer
     les dés" tells the player the turn already happened. */
  const idleDice = Array.from({ length: view.config.twoDice ? 2 : 1 }, () => null)
  const faces: Array<number | null> = tumble.faces.length > 0 ? tumble.faces : idleDice
  const dieState: DieState =
    tumble.faces.length === 0 ? 'idle' : tumble.settled ? 'result' : 'rolling'

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
        <section
          className="panel stack turn-panel"
          data-testid="turn-panel"
          data-playing={playing ? 'true' : 'false'}
        >
          <h2>
            {yourTurn
              ? t('table.yourTurn')
              : t('table.turnOf', { name: seats[view.turn.seat]?.name ?? '' })}
          </h2>
          <div className="row">
            {faces.map((value, index) => (
              /* Keyed by slot, not by turn: the same node has to survive from
                 the tumble into the settle, or the animation restarts from
                 scratch instead of landing. */
              <Die key={index} value={value} state={dieState} />
            ))}
            <button
              type="button"
              className="primary"
              onClick={() => {
                setSentFor(signature)
                onRoll()
              }}
              disabled={!canRoll}
            >
              {t('table.roll')}
            </button>
          </div>
          {you && you.blocked !== null ? <p className="hint">{t('table.blockedYou')}</p> : null}
          <p className="hint code-line">{view.code}</p>
        </section>

        {/* Held back until the chain has played: the pawn should reach the
            garden before the panel announces that it did. */}
        {view.phase === 'over' && !playing ? (
          <GameOver view={view} onRestart={onRestart} onLeave={onLeave} />
        ) : null}

        <section className="panel stack">
          <h3>{t('table.seats')}</h3>
          <ul className="seat-list">
            {seats.map((seat) => (
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
            {log.map((line) => (
              <li key={line.id}>{line.text}</li>
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
