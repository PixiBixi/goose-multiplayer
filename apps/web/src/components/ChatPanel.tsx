import type { ChatLine } from '@goose/protocol'
import type { FormEvent, JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/index.js'
import { CHAT_MAX, validChat } from '../lib/limits.js'

export function ChatPanel({
  lines,
  onSend,
}: {
  lines: ChatLine[]
  onSend: (text: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState('')
  const feed = useRef<HTMLOListElement>(null)

  useEffect(() => {
    /* Newest line at the bottom, which is where the eye already is.
       scrollTop rather than scrollTo: jsdom implements the property, not the
       method, and this must not throw in a test that is about something else. */
    const element = feed.current
    if (element) element.scrollTop = element.scrollHeight
  }, [lines.length])

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (!validChat(draft)) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <section className="panel chat">
      <h3>{t('table.chat')}</h3>
      <ol className="chat-feed" ref={feed}>
        {lines.length === 0 ? <li className="hint">{t('table.chatEmpty')}</li> : null}
        {lines.map((line) => (
          <li key={`${line.at}-${line.seat ?? 'x'}-${line.text}`}>
            <strong>{line.name}</strong> {line.text}
          </li>
        ))}
      </ol>
      <form className="row" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="chat-text">
          {t('table.chat')}
        </label>
        <input
          id="chat-text"
          type="text"
          maxLength={CHAT_MAX}
          placeholder={t('table.chatPlaceholder')}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
        />
        <button type="submit">{t('table.chatSend')}</button>
      </form>
    </section>
  )
}
