import { clientSchemas } from '@goose/protocol'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'
import { t } from '../i18n/index.js'

export type HomeProps = {
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
  error: string | null
  initialCode?: string
}

/* The two fields are validated against the very schemas the server validates
   them against. Nothing is re-specified here: `.shape` reaches into the
   protocol's own rule so a change to the wire changes this form for free. */
const nameSchema = clientSchemas.createRoom.shape.name
const codeSchema = clientSchemas.joinRoom.shape.code

export function Home({ onCreate, onJoin, error, initialCode = '' }: HomeProps): JSX.Element {
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialCode)
  const [problem, setProblem] = useState<string | null>(null)

  const nameOk = nameSchema.safeParse(name).success
  const codeOk = codeSchema.safeParse(code).success

  const create = (): void => {
    if (!nameOk) {
      setProblem(t('home.nameRequired'))
      return
    }
    setProblem(null)
    onCreate(name.trim())
  }

  const join = (event: FormEvent): void => {
    event.preventDefault()
    if (!nameOk) {
      setProblem(t('home.nameRequired'))
      return
    }
    if (!codeOk) {
      setProblem(t('home.codeRequired'))
      return
    }
    setProblem(null)
    onJoin(code, name.trim())
  }

  return (
    <form className="home" onSubmit={join}>
      <section className="panel stack">
        <div className="field">
          <label htmlFor="player-name">{t('home.nameLabel')}</label>
          <input
            id="player-name"
            type="text"
            autoComplete="nickname"
            maxLength={24}
            placeholder={t('home.namePlaceholder')}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </div>

        <div className="home-actions">
          <div className="stack">
            <h2>{t('home.createTitle')}</h2>
            <button type="button" className="primary" onClick={create}>
              {t('home.createButton')}
            </button>
          </div>

          <div className="stack">
            <h2>{t('home.joinTitle')}</h2>
            <div className="field">
              <label htmlFor="table-code">{t('home.codeLabel')}</label>
              <input
                id="table-code"
                type="text"
                className="code"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={6}
                placeholder={t('home.codePlaceholder')}
                value={code}
                onChange={(event) => {
                  /* The wire wants upper case: doing it while typing keeps
                     what is on screen and what is emitted identical. */
                  setCode(event.target.value.toUpperCase())
                }}
              />
            </div>
            <button type="submit">{t('home.joinButton')}</button>
          </div>
        </div>

        {problem === null ? null : (
          <p className="alert" role="alert">
            {problem}
          </p>
        )}
        {error === null ? null : (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
      </section>
    </form>
  )
}
