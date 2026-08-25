import type { JSX } from 'react'
import { t } from './i18n/index.js'

export function App(): JSX.Element {
  return (
    <div className="shell">
      <header className="masthead">
        <h1>{t('app.title')}</h1>
        <p>{t('app.tagline')}</p>
      </header>
    </div>
  )
}
