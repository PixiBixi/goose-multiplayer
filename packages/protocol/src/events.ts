import type { ChatLine, TableView } from './views.js'

export type ServerEvents = {
  tableView: (view: TableView) => void
  /* The log goes out once when a seat sits down, then one line at a time: it
     is up to 200 lines of 500 characters, too much to ride in every view. */
  chatHistory: (lines: ChatLine[]) => void
  chatLine: (line: ChatLine) => void
  error: (payload: { code: string; message: string }) => void
}

export type ServerEvent = keyof ServerEvents
