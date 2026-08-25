import { en } from './en.js'
import { fr } from './fr.js'

export type Dictionary = Record<string, string>
export type Language = 'fr' | 'en'

const DICTIONARIES: Record<Language, Dictionary> = { fr, en }

/* The product ships in French, so the browser locale does not pick the
   language: en.ts exists to keep a second language one call away, and
   i18n.test.ts holds the two dictionaries key for key. */
let current: Language = 'fr'

export function setLanguage(language: Language): void {
  current = language
}

export function language(): Language {
  return current
}

/** Returns the key itself when it is unknown, so a typo shows up on screen. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const template = DICTIONARIES[current][key] ?? fr[key as keyof typeof fr]
  if (template === undefined) return key
  return template.replace(/\{(\w+)\}/g, (whole: string, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}
