import { clientSchemas } from '@goose/protocol'
import type { ClientEvent, TableView } from '@goose/protocol'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { t } from '../i18n/index.js'
import { rememberedTable, rememberTable, sessionToken } from '../lib/session.js'
import { initialState, reduce, type Status } from './game-reducer.js'

/** The payload a client action carries, taken from the schema that guards it. */
export type PayloadOf<E extends ClientEvent> = ReturnType<(typeof clientSchemas)[E]['parse']>
export type Send = <E extends ClientEvent>(event: E, payload: PayloadOf<E>) => void

export type GameSocket = {
  view: TableView | null
  status: Status
  error: string | null
  send: Send
  create: (name: string) => void
  join: (code: string, name: string) => void
  dismiss: () => void
  forget: () => void
}

type ServerError = { code: string; message: string }

/* The server speaks in codes; the player reads French. An unknown code falls
   back to the server's own message rather than to a blank alert. */
function messageFor(error: ServerError): string {
  const key = `error.${error.code}`
  const translated = t(key)
  return translated === key ? error.message : translated
}

export function useGameSocket(): GameSocket {
  const [state, dispatch] = useReducer(reduce, initialState)
  const socket = useRef<Socket | null>(null)
  /* The last table this tab was seated at. A reconnect arrives on a brand new
     socket with empty server-side data, so the seat has to be claimed again. */
  const seated = useRef<{ code: string; name: string } | null>(null)

  /* Validated against the very schema the server will validate it against, so
     a malformed intent never leaves the tab. The schema is shared, not copied:
     this adds no rule of its own. */
  const emit = useCallback(
    <E extends ClientEvent>(connection: Socket, event: E, payload: PayloadOf<E>): void => {
      const parsed = clientSchemas[event].safeParse(payload as never)
      if (!parsed.success) {
        dispatch({ type: 'error', error: t('error.bad_payload') })
        return
      }
      connection.emit(event, parsed.data)
    },
    [],
  )

  useEffect(() => {
    /* Same origin: vite proxies /socket.io to the server in dev, and in
       production the server serves this bundle itself. */
    const connection = io({ transports: ['websocket', 'polling'] })
    socket.current = connection

    connection.on('connect', () => {
      dispatch({ type: 'status', status: 'open' })
      /* On a reconnect the ref still knows the table; after a reload only
         storage does. The session token is what makes either land back on the
         same seat instead of seating a stranger or burning the whole grace. */
      const table = seated.current ?? rememberedTable()
      if (table !== null) {
        emit(connection, 'joinRoom', { ...table, session: sessionToken() })
      }
    })
    connection.on('disconnect', () => {
      dispatch({ type: 'status', status: 'closed' })
    })
    connection.on('connect_error', () => {
      dispatch({ type: 'status', status: 'closed' })
    })
    connection.on('tableView', (view: TableView) => {
      seated.current = { code: view.code, name: view.you.name }
      rememberTable(seated.current)
      dispatch({ type: 'view', view })
    })
    connection.on('error', (error: ServerError) => {
      /* A refused rejoin means the table is gone. Forget it, or every reload
         from now on lands on the same refusal. */
      if (error.code === 'join_failed') {
        seated.current = null
        rememberTable(null)
      }
      dispatch({ type: 'error', error: messageFor(error) })
    })

    return () => {
      socket.current = null
      connection.close()
    }
  }, [emit])

  const send = useCallback<Send>(
    (event, payload) => {
      const connection = socket.current
      if (connection) emit(connection, event, payload)
    },
    [emit],
  )

  const create = useCallback(
    (name: string) => {
      send('createRoom', { name, session: sessionToken() })
    },
    [send],
  )

  const join = useCallback(
    (code: string, name: string) => {
      send('joinRoom', { code, name, session: sessionToken() })
    },
    [send],
  )

  const dismiss = useCallback(() => {
    dispatch({ type: 'dismiss' })
  }, [])

  const forget = useCallback(() => {
    seated.current = null
    rememberTable(null)
    dispatch({ type: 'left' })
  }, [])

  return {
    view: state.view,
    status: state.status,
    error: state.error,
    send,
    create,
    join,
    dismiss,
    forget,
  }
}
