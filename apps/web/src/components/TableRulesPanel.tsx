import type { TableConfig } from '@goose/engine'
import type { JSX } from 'react'
import { t } from '../i18n/index.js'

export type TableRulesPanelProps = {
  config: TableConfig
  canEdit: boolean
  onChange: (patch: Partial<TableConfig>) => void
}

type Rule = 'exactFinish' | 'twoDice' | 'rescue' | 'opening9'

const RULES: Rule[] = ['exactFinish', 'twoDice', 'rescue', 'opening9']

export function TableRulesPanel({ config, canEdit, onChange }: TableRulesPanelProps): JSX.Element {
  return (
    <section className="panel stack">
      <h3>{t('lobby.rulesTitle')}</h3>
      {RULES.map((rule) => {
        /* The opening nine needs two dice to exist at all: the server refuses
           the combination, so the switch says so instead of letting a host
           set a rule that quietly does nothing. */
        const requiresTwoDice = rule === 'opening9' && !config.twoDice
        const disabled = !canEdit || requiresTwoDice
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
      {canEdit ? null : <p className="hint">{t('lobby.rulesHostOnly')}</p>}
    </section>
  )
}
