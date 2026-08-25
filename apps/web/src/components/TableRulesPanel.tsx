import type { TableConfig, TripleDouble } from '@goose/engine'
import type { JSX } from 'react'
import { t } from '../i18n/index.js'

export type TableRulesPanelProps = {
  config: TableConfig
  canEdit: boolean
  onChange: (patch: Partial<TableConfig>) => void
}

type Rule = 'exactFinish' | 'twoDice' | 'rescue' | 'opening9' | 'doubleAgain' | 'escapeOnDouble'

const RULES: Rule[] = [
  'exactFinish',
  'twoDice',
  'rescue',
  'opening9',
  'doubleAgain',
  'escapeOnDouble',
]

const OUTCOMES: TripleDouble[] = ['pass', 'restart']

/* How long a seat sits in the well or the prison before the trap lets go.
   `null` is the historic table, rescue only, kept because a host is allowed
   to play it that way and not because it is a good idea: it measured as an
   elimination in the large majority of games. */
const WAITS: (number | null)[] = [1, 2, 3, 5, null]

function waitLabel(turns: number | null): string {
  if (turns === null) return t('rule.maxBlockedTurnsNever')
  return t(turns === 1 ? 'rule.maxBlockedTurnsOne' : 'rule.maxBlockedTurnsMany', { turns })
}

const LABEL: Record<TripleDouble, string> = {
  pass: 'rule.tripleDoublePass',
  restart: 'rule.tripleDoubleRestart',
}

export function TableRulesPanel({ config, canEdit, onChange }: TableRulesPanelProps): JSX.Element {
  /* Both need two dice to exist at all: there is no nine to open with and no
     double to roll on a single die. The switch says so rather than letting a
     host set a rule that quietly does nothing. */
  const needsTwoDice = !config.twoDice
  /* And the third double is a question that only makes sense once a double
     grants anything in the first place. */
  const outcomeDisabled = !canEdit || needsTwoDice || !config.doubleAgain

  return (
    <section className="panel stack">
      <h3>{t('lobby.rulesTitle')}</h3>
      {RULES.map((rule) => {
        const disabled =
          !canEdit ||
          ((rule === 'opening9' || rule === 'doubleAgain' || rule === 'escapeOnDouble') &&
            needsTwoDice)
        return (
          <label key={rule} className="switch" data-disabled={disabled}>
            <input
              type="checkbox"
              name={rule}
              checked={config[rule]}
              disabled={disabled}
              onChange={(event) => {
                onChange({ [rule]: event.target.checked })
              }}
            />
            <span className="switch-text">
              <span className="switch-name">{t(`rule.${rule}`)}</span>
              <span className="switch-help">{t(`rule.${rule}Help`)}</span>
            </span>
          </label>
        )
      })}

      {/* A choice, not a switch: neither outcome is an "off", so two labelled
          options say what the table plays instead of a checkbox nobody can
          read the other half of. */}
      <fieldset className="choice" data-disabled={outcomeDisabled}>
        <legend>{t('rule.tripleDouble')}</legend>
        <p className="switch-help">{t('rule.tripleDoubleHelp')}</p>
        {OUTCOMES.map((outcome) => (
          <label key={outcome} className="switch" data-disabled={outcomeDisabled}>
            <input
              type="radio"
              name="tripleDouble"
              value={outcome}
              checked={config.tripleDouble === outcome}
              disabled={outcomeDisabled}
              onChange={() => {
                onChange({ tripleDouble: outcome })
              }}
            />
            <span className="switch-text">
              <span className="switch-name">{t(LABEL[outcome])}</span>
              <span className="switch-help">{t(`${LABEL[outcome]}Help`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* The other half of the same question as the switches above: how long a
          trap keeps its player. A row of turn counts rather than a switch,
          because "off" here is one of the choices and the worst one. */}
      <fieldset className="choice" data-disabled={!canEdit}>
        <legend>{t('rule.maxBlockedTurns')}</legend>
        <p className="switch-help">{t('rule.maxBlockedTurnsHelp')}</p>
        {WAITS.map((turns) => (
          <label key={String(turns)} className="switch" data-disabled={!canEdit}>
            <input
              type="radio"
              name="maxBlockedTurns"
              value={String(turns)}
              checked={config.maxBlockedTurns === turns}
              disabled={!canEdit}
              onChange={() => {
                onChange({ maxBlockedTurns: turns })
              }}
            />
            <span className="switch-text">
              <span className="switch-name">{waitLabel(turns)}</span>
              {turns === null ? (
                <span className="switch-help">{t('rule.maxBlockedTurnsNeverHelp')}</span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>

      {canEdit ? null : <p className="hint">{t('lobby.rulesHostOnly')}</p>}
    </section>
  )
}
