import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { SeatView, TableView } from '@goose/protocol'
import { Board } from '../components/Board.js'
import { ChatPanel } from '../components/ChatPanel.js'
import { Die } from '../components/Die.js'
import type { DieState } from '../components/Die.js'
import { GameOver } from '../components/GameOver.js'
import { RuleCard } from '../components/RuleCard.js'
import { Seat } from '../components/Seat.js'
import { SquareIcon } from '../components/SquareIcon.js'
import type { Tone } from '../lib/square-mark.js'
import { useDiceTumble } from '../hooks/useDiceTumble.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
import { useRuleCards } from '../hooks/useRuleCards.js'
import { turnSignature, useStepPlayback } from '../hooks/useStepPlayback.js'
import { t } from '../i18n/index.js'
import { describeStep, flightOf } from '../lib/describe-step.js'

/* Slow enough that a goose chain reads as two separate hops and a bounce
   reads as going backwards, quick enough that a six step chain does not hold
   the table for four seconds. */
const STEP_MS = 450

/* A teleport does not step, it flies, and the whole point is that fifty three
   squares look like fifty three squares. Fixed, not proportional: at a speed
   that suits a six square hop the opening nine would hold the table for eight
   seconds, and at a speed that suits the opening nine the bridge would be a
   flicker. The step that carries a flight gets a little more than the flight
   itself, so the pawn lands before the next line of the chain arrives. */
const FLIGHT_MS = 1200
const FLIGHT_STEP_MS = FLIGHT_MS + 250

/* Long enough to read one sentence, short enough that a chain firing three
   rules does not become an interlude. It holds the roll button down while it
   is up, so the table never has a card explaining the turn that has already
   been overtaken by the next one. */
const CARD_MS = 3000

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
    dwellFor: (step) => (flightOf(step) ? FLIGHT_STEP_MS : undefined),
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

  /* The rule that just fired, named by the engine and explained beside the
     board. Fed off the steps that have actually played, so the card lands with
     the pawn rather than ahead of it. */
  const revealed = tumble.settled ? playback.played : 0
  const cards = useRuleCards(signature, view.lastTurn?.steps ?? [], revealed, {
    dwellMs: CARD_MS,
    reduced,
  })

  /* The chain on screen, and the whole sequence. They are not the same thing:
     the chain is what the dice and the pawn are still saying, the sequence
     also covers the round trip between the click and the server's answer and
     the card still explaining the rule that fired. */
  const chainPlaying = view.lastTurn !== null && (!tumble.settled || !playback.done)
  const playing = awaitingRoll || chainPlaying || cards.holds

  /* Whose turn it is on screen, held on the seat that is still resolving. The
     next seat's name appearing in the heading while the dice are still
     spinning says the roll was not a double, which is the result arriving
     early by another route. Taken off the server's own lastTurn, so no rule is
     being guessed at here. */
  const turnSeat = chainPlaying && view.lastTurn !== null ? view.lastTurn.seat : view.turn.seat

  /* The view only ever carries the last turn, so the feed is kept here. It
     stores what the server narrated, it never re-derives a chain, and a line
     appears when its own step plays rather than the whole chain landing at
     once. */
  const [log, setLog] = useState<LogLine[]>([])
  useEffect(() => {
    const turn = view.lastTurn
    if (turn === null) {
      setLog([])
      return
    }
    if (revealed === 0) return
    const roller = view.seats[turn.seat]?.name ?? ''
    const total = turn.dice.reduce((a, b) => a + b, 0)
    /* A step this bundle cannot name is left out of the feed rather than
       printed as a blank line: an old tab meeting a rule shipped after it
       loaded misses one line and keeps the rest of the turn. */
    const narrated = turn.steps.slice(0, revealed).flatMap((step, index) => {
      const text = describeStep(step, names)
      return text === null ? [] : [{ id: `${signature}#${String(index)}`, text }]
    })
    const lines: LogLine[] = [
      { id: `${signature}#roll`, text: t('table.rolled', { name: roller, total }) },
      ...narrated,
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
    const fell = played.find((step) => step.kind === 'blocked' && step.seat === turn.seat)
    /* A seat that started its turn in a trap says so in the chain's very first
       step, and it is still in there until the escape actually plays. Without
       this the plate would drop the trap the moment the dice settle, which is
       exactly the turn where the player is watching it. */
    const opening = turn.steps[0]
    const trapped =
      opening?.kind === 'escape' || opening?.kind === 'escapeFailed' ? opening.reason : null
    const escaped = played.some((step) => step.kind === 'escape' && step.seat === turn.seat)
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
            blocked: fell?.kind === 'blocked' ? fell.reason : escaped ? null : trapped,
            skipTurns: waits,
          }
        : seat,
    )
  }, [view.seats, view.lastTurn, playback.done, playback.played, playback.square])

  /* The pawn in the air. Which steps earn a flight is read off the step kind,
     never off the distance between two squares: the engine is the only thing
     that knows a teleport fired, and a six square bridge is as much a teleport
     as a fifty three square opening nine.

     Reduced motion gets no flight at all. The pawn is already on the square
     the server put it on, which is the whole of the information. */
  const flight = useMemo(() => {
    const turn = view.lastTurn
    if (turn === null || reduced || playback.done || playback.played === 0) return null
    const shown = turn.steps[playback.played - 1]
    const route = shown ? flightOf(shown) : null
    if (route === null) return null
    return { seat: turn.seat, from: route.from, to: route.to, durationMs: FLIGHT_MS }
  }, [view.lastTurn, reduced, playback.done, playback.played])

  const yourTurn = turnSeat === view.you.seat
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
        <Board seats={seats} highlight={playback.square} flight={flight} />
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
        {/* Beside the board and never over it: the rule is being explained
            about a pawn the player is still looking at. */}
        {cards.current ? <RuleCard card={cards.current} onDismiss={cards.dismiss} /> : null}

        <section
          className="panel stack turn-panel"
          data-testid="turn-panel"
          data-playing={playing ? 'true' : 'false'}
        >
          <h2>
            {yourTurn
              ? t('table.yourTurn')
              : t('table.turnOf', { name: seats[turnSeat]?.name ?? '' })}
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
          {you && you.blocked !== null ? (
            <p className="hint">{t(you.blockedTrying ? 'table.blockedTry' : 'table.blockedYou')}</p>
          ) : null}
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
                isTurn={seat.seat === turnSeat && view.phase === 'playing'}
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
