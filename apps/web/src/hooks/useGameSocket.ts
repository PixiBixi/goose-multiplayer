import { clientSchemas } from '@goose/protocol'
import type { ClientEvent, TableView } from '@goose/protocol'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { t } from '../i18n/index.js'
import { initialState, reduce, type Status } from './game-reducer.js'

/** The payload a client action carries, taken from the schema that guards it. */
export type PayloadOf<E extends ClientEvent> = ReturnType<(typeof clientSchemas)[E]['parse']>
export type Send = <E extends ClientEvent>(event: E, payload: PayloadOf<E>) => void

export type GameSocket = {
  view: TableView | null
  status: Status
  error: string | null
  send: Send
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

  useEffect(() => {
    /* Same origin: vite proxies /socket.io to the server in dev, and in
       production the server serves this bundle itself. */
    const connection = io({ transports: ['websocket', 'polling'] })
    socket.current = connection

    connection.on('connect', () => {
      dispatch({ type: 'status', status: 'open' })
    })
    connection.on('disconnect', () => {
      dispatch({ type: 'status', status: 'closed' })
    })
    connection.on('connect_error', () => {
      dispatch({ type: 'status', status: 'closed' })
    })
    connection.on('tableView', (view: TableView) => {
      dispatch({ type: 'view', view })
    })
    connection.on('error', (error: ServerError) => {
      dispatch({ type: 'error', error: messageFor(error) })
    })

    return () => {
      socket.current = null
      connection.close()
    }
  }, [])

  /* Validated against the very schema the server will validate it against, so
     a malformed intent never leaves the tab. The schema is shared, not copied:
     this adds no rule of its own. */
  const send = useCallback<Send>((event, payload) => {
    const parsed = clientSchemas[event].safeParse(payload as never)
    if (!parsed.success) {
      dispatch({ type: 'error', error: t('error.bad_payload') })
      return
    }
    socket.current?.emit(event, parsed.data)
  }, [])

  const dismiss = useCallback(() => {
    dispatch({ type: 'dismiss' })
  }, [])

  const forget = useCallback(() => {
    dispatch({ type: 'left' })
  }, [])

  return { view: state.view, status: state.status, error: state.error, send, dismiss, forget }
}
