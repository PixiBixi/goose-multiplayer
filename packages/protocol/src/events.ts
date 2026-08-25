import type { TableView } from './views.js'

export type ServerEvents = {
  tableView: (view: TableView) => void
  error: (payload: { code: string; message: string }) => void
}

export type ServerEvent = keyof ServerEvents
