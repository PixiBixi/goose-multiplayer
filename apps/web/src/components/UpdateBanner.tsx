import type { JSX } from 'react'
import { useState } from 'react'
import { t } from '../i18n/index.js'

export type UpdateBannerProps = {
  /** The version this bundle was built as, baked in by vite. */
  built: string
  /** The version the server says it is running, off the table view. */
  running: string
}

/* No cache header protects a tab that is simply never reloaded, so the client
   notices for itself: the server stamps its version into every view, and the
   two disagree exactly when this tab has been left open across a deploy.

   Discreet and dismissible on purpose. The tab is still playable, it is only
   out of date, and this never reloads by itself: a page that reloads under a
   player in the middle of a turn costs them the turn. It says what is wrong,
   offers the reload, and gets out of the way. */
export function UpdateBanner({ built, running }: UpdateBannerProps): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false)
  /* 'dev' is what either side reports when it cannot read the changelog beside
     it. Unreadable is not "different": comparing it would put a banner in
     front of every player on a local build. */
  const comparable = built !== 'dev' && running !== 'dev' && built !== '' && running !== ''
  if (dismissed || !comparable || built === running) return null

  return (
    <p className="update-banner" role="status" data-testid="update-banner">
      <span className="update-banner-text">
        <strong>{t('update.title')}</strong> {t('update.text')}
      </span>
      <button
        type="button"
        onClick={() => {
          window.location.reload()
        }}
      >
        {t('update.reload')}
      </button>
      <button
        type="button"
        className="update-banner-later"
        onClick={() => {
          setDismissed(true)
        }}
      >
        {t('update.later')}
      </button>
    </p>
  )
}
