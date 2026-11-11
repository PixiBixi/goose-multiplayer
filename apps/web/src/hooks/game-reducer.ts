import type { ChatLine, TableView } from '@goose/protocol'

/* The server keeps this many lines; the client keeps no more. */
const CHAT_CAP = 200

export type Status = 'connecting' | 'open' | 'closed'

export type ClientState = {
  view: TableView | null
  status: Status
  error: string | null
  chat: ChatLine[]
}

export type ClientAction =
  | { type: 'view'; view: TableView }
  | { type: 'status'; status: Status }
  | { type: 'error'; error: string }
  | { type: 'dismiss' }
  | { type: 'left' }
  | { type: 'chatHistory'; lines: ChatLine[] }
  | { type: 'chatLine'; line: ChatLine }

export const initialState: ClientState = { view: null, status: 'connecting', error: null, chat: [] }

/* The client knows no rules. The server ships legalMoves inside each view; this
   reducer stores what arrived and nothing else. Deriving a rule here is how the
   two sides drift apart. */
export function reduce(state: ClientState, action: ClientAction): ClientState {
  switch (action.type) {
    case 'view':
      return { ...state, view: action.view, error: null }
    case 'status':
      /* The view survives a drop on purpose: a table that blanks on every
         hiccup is worse than one showing a slightly stale board. */
      return { ...state, status: action.status }
    case 'error':
      return { ...state, error: action.error }
    case 'dismiss':
      return { ...state, error: null }
    case 'left':
      return { ...state, view: null, error: null, chat: [] }
    case 'chatHistory':
      return { ...state, chat: action.lines.slice(-CHAT_CAP) }
    case 'chatLine':
      return { ...state, chat: [...state.chat, action.line].slice(-CHAT_CAP) }
  }
}
