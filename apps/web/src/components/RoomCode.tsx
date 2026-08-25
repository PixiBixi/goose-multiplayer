import type { JSX } from 'react'
import { useState } from 'react'
import { t } from '../i18n/index.js'
import { urlForRoom } from '../lib/room-url.js'

/* The one element that carries data-testid="room-code": the end-to-end suite
   reads the six characters from here. A second element with the same hook is
   a selector that connects nothing, so the table screen prints the code
   without it. */
export function RoomCode({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false)

  const copy = (): void => {
    const link = urlForRoom(window.location.origin, window.location.pathname, code)
    void navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true)
      },
      () => {
        setCopied(false)
      },
    )
  }

  return (
    <div className="room-code">
      <span className="room-code-label">{t('lobby.codeLabel')}</span>
      <strong data-testid="room-code" className="room-code-value">
        {code}
      </strong>
      <button type="button" onClick={copy}>
        {copied ? t('lobby.copied') : t('lobby.copy')}
      </button>
      <p className="hint">{t('lobby.codeHint')}</p>
    </div>
  )
}
