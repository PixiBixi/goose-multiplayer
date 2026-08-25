import { effectAt } from '@goose/engine'
import type { Square } from '@goose/engine'
import { t } from '../i18n/index.js'

export type Tone = 'plain' | 'goose' | 'move' | 'trap' | 'death' | 'garden'
export type IconName =
  'goose' | 'bridge' | 'inn' | 'well' | 'maze' | 'prison' | 'skull' | 'dice' | 'garden'

export type SquareMark = {
  tone: Tone
  /** null on a plain square. Colour is emphasis, the icon carries the meaning. */
  icon: IconName | null
  name: string
  label: string
}

/* What a square does is printed on the board, not decided by the client:
   effectAt is the engine's own lookup table, so a rule change repaints the
   board for free. This maps that effect onto ink and icon, nothing more. */
export function markFor(square: Square): SquareMark {
  const effect = effectAt(square)
  const { tone, icon, key } = describe(effect?.kind, square)
  const name = key === null ? t('square.plain', { n: square }) : t(key)
  return {
    tone,
    icon,
    name,
    label: key === null ? name : t('square.label', { n: square, name }),
  }
}

function describe(
  kind: NonNullable<ReturnType<typeof effectAt>>['kind'] | undefined,
  square: Square,
): { tone: Tone; icon: IconName | null; key: string | null } {
  switch (kind) {
    case 'goose':
      return { tone: 'goose', icon: 'goose', key: 'square.goose' }
    case 'bridge':
      return { tone: 'move', icon: 'bridge', key: 'square.bridge' }
    case 'dice':
      return { tone: 'move', icon: 'dice', key: 'square.dice' }
    case 'maze':
      return { tone: 'trap', icon: 'maze', key: 'square.maze' }
    case 'inn':
      return { tone: 'trap', icon: 'inn', key: 'square.inn' }
    case 'block':
      /* The well and the prison share an effect but not a drawing: two traps
         that look the same are two traps a player cannot plan around. */
      return square === 31
        ? { tone: 'trap', icon: 'well', key: 'square.well' }
        : { tone: 'trap', icon: 'prison', key: 'square.prison' }
    case 'death':
      return { tone: 'death', icon: 'skull', key: 'square.death' }
    case 'garden':
      return { tone: 'garden', icon: 'garden', key: 'square.garden' }
    default:
      return { tone: 'plain', icon: null, key: null }
  }
}
