import type { TableConfig } from '@goose/engine'
import type { JSX } from 'react'
import { useEffect, useMemo } from 'react'
import { UpdateBanner } from './components/UpdateBanner.js'
import { useGameSocket } from './hooks/useGameSocket.js'
import { t } from './i18n/index.js'
import { codeFromSearch, rememberRoom } from './lib/room-url.js'
import { Home } from './screens/Home.js'
import { Lobby } from './screens/Lobby.js'
import { Table } from './screens/Table.js'

export function App(): JSX.Element {
  const { view, status, error, send, create, join, dismiss, forget } = useGameSocket()
  const initialCode = useMemo(() => codeFromSearch(window.location.search) ?? '', [])

  /* Keeps the address bar in step with the table, so a refresh or a shared
     link lands on the right code instead of on an empty home screen. */
  useEffect(() => {
    rememberRoom(view?.code ?? null)
  }, [view?.code])

  const leave = (): void => {
    send('leaveRoom', {})
    forget()
  }

  return (
    <div className="shell">
      <header className="masthead">
        <h1>{t('app.title')}</h1>
        <p>{t('app.tagline')}</p>
        <span className="connection" data-status={status}>
          <span className="dot" />
          {t(`status.${status}`)}
        </span>
      </header>

      {/* Above the error banner and below the masthead: it is not an error and
          it never interrupts the game, but a player whose tab has gone stale
          should read it before wondering why a rule showed nothing. */}
      {view !== null ? <UpdateBanner built={__APP_VERSION__} running={view.version} /> : null}

      {view !== null && error !== null ? (
        <p className="alert" role="alert">
          {error}{' '}
          <button type="button" onClick={dismiss}>
            OK
          </button>
        </p>
      ) : null}

      <main>
        {view === null ? (
          <Home initialCode={initialCode} error={error} onCreate={create} onJoin={join} />
        ) : view.phase === 'lobby' ? (
          <Lobby
            view={view}
            onConfigure={(patch: Partial<TableConfig>) => {
              send('configureTable', patch)
            }}
            onStart={() => {
              send('startGame', {})
            }}
            onLeave={leave}
          />
        ) : (
          <Table
            view={view}
            onRoll={() => {
              send('roll', {})
            }}
            onChat={(text) => {
              send('chat', { text })
            }}
            onRestart={() => {
              send('restart', {})
            }}
            onLeave={leave}
          />
        )}
      </main>
    </div>
  )
}
