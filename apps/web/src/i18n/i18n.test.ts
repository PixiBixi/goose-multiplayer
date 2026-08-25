import { describe, expect, it } from 'vitest'
import { en } from './en.js'
import { fr } from './fr.js'
import { t } from './index.js'

describe('i18n', () => {
  it('translates the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
  })

  it('leaves no key untranslated', () => {
    for (const [key, value] of Object.entries(fr)) {
      expect(value.length, `fr.${key} is empty`).toBeGreaterThan(0)
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value.length, `en.${key} is empty`).toBeGreaterThan(0)
    }
  })

  it('uses no em dash anywhere', () => {
    for (const value of [...Object.values(fr), ...Object.values(en)]) {
      expect(value).not.toContain('—')
    }
  })

  it('serves the french copy and fills its placeholders', () => {
    expect(t('home.nameLabel')).toBe('Ton nom')
    expect(t('table.turnOf', { name: 'Claire' })).toContain('Claire')
  })

  it('returns the key itself when it is unknown, so a typo is visible', () => {
    expect(t('nope.not.a.key')).toBe('nope.not.a.key')
  })
})
