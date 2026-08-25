import type { Step } from '@goose/engine'
import { t } from '../i18n/index.js'
import type { IconName, Tone } from './square-mark.js'
import { trapOf, unknownWireValue } from './wire.js'

/* One card per rule the engine can name. The id is derived from the step
   kind and from what the step itself carries, never from the square it
   mentions and never from the table config: the client knows no rules, it
   only knows how to read the account the server sent it.

   The "why" is the whole point of the card. It says why the rule is in the
   game, not what it just did to your pawn, because the turn log already says
   that and the player who has forgotten a rule is not helped by a second
   description of the move. */
export type RuleId =
  | 'opening9'
  | 'goose'
  | 'bridge'
  | 'dice'
  | 'inn'
  | 'well'
  | 'prison'
  | 'maze'
  | 'death'
  | 'bounce'
  | 'overshoot'
  | 'rescue'
  | 'freed'
  | 'escape'
  | 'double'
  | 'tripleDouble'
  | 'garden'
  | 'deadlock'

export type RuleCardContent = {
  id: RuleId
  icon: IconName
  tone: Tone
  name: string
  why: string
}

/* Ink and icon per rule, kept in the same vocabulary as the squares so a card
   about the Well is the colour of the Well on the board. */
const LOOK: Record<RuleId, { icon: IconName; tone: Tone }> = {
  opening9: { icon: 'dice', tone: 'move' },
  goose: { icon: 'goose', tone: 'goose' },
  bridge: { icon: 'bridge', tone: 'move' },
  dice: { icon: 'dice', tone: 'move' },
  inn: { icon: 'inn', tone: 'trap' },
  well: { icon: 'well', tone: 'trap' },
  prison: { icon: 'prison', tone: 'trap' },
  maze: { icon: 'maze', tone: 'trap' },
  death: { icon: 'skull', tone: 'death' },
  bounce: { icon: 'garden', tone: 'garden' },
  overshoot: { icon: 'garden', tone: 'garden' },
  rescue: { icon: 'well', tone: 'trap' },
  freed: { icon: 'well', tone: 'trap' },
  escape: { icon: 'dice', tone: 'move' },
  double: { icon: 'dice', tone: 'move' },
  tripleDouble: { icon: 'dice', tone: 'move' },
  garden: { icon: 'garden', tone: 'garden' },
  deadlock: { icon: 'prison', tone: 'trap' },
}

/** The rule a step fired, or null when the step fired no rule this bundle can
    name: one that fires none, or one whose kind was added to the engine after
    this tab was loaded. */
export function ruleOf(step: Step): RuleId | null {
  switch (step.kind) {
    case 'opening9':
      return 'opening9'
    case 'goose':
      return 'goose'
    case 'bridge':
      return 'bridge'
    case 'dice':
      return 'dice'
    case 'maze':
      return 'maze'
    case 'death':
      return 'death'
    case 'bounce':
      return 'bounce'
    case 'overshoot':
      return 'overshoot'
    case 'blocked':
      /* Off the step's own reason, not off the square: 31 and 52 are the
         board's business, and reading them here would be the client working
         out a rule for itself. */
      return trapOf(step.reason)
    case 'skip':
      return 'inn'
    case 'rescue':
      return 'rescue'
    case 'freed':
      return 'freed'
    case 'escape':
      return 'escape'
    case 'escapeFailed':
      /* A miss fires no rule. The turn log says the seat tried, and a card on
         every failed attempt would be the same sentence three turns running. */
      return null
    case 'double':
      return 'double'
    case 'tripleDouble':
      return 'tripleDouble'
    case 'win':
      return 'garden'
    case 'deadlock':
      return 'deadlock'
    case 'move':
      /* An ordinary advance is not a rule. A card on every roll would train
         the table to stop reading them. */
      return null
    default:
      /* A kind this bundle has never heard of. See wire.ts: the build still
         fails when a rule is added to the engine and forgotten here, and an
         old tab still gets a table instead of a blank page. */
      return unknownWireValue(step, null)
  }
}

export function cardFor(step: Step): RuleCardContent | null {
  const id = ruleOf(step)
  if (id === null) return null
  /* Guarded even though the type says it cannot miss: `id` is derived from a
     step that came off the wire, and this lookup is where an unnamed rule used
     to take the whole page down. */
  const look = LOOK[id] as (typeof LOOK)[RuleId] | undefined
  if (look === undefined) return null
  /* The cards that open a trap wear the trap they opened, and the step is what
     says which one. Same copy either way: one rule, two doors. The escaping
     double keeps its dice, because the dice are the rule. */
  const opensTrap = step.kind === 'rescue' || step.kind === 'freed'
  const icon = opensTrap && step.reason === 'prison' ? 'prison' : look.icon
  return {
    id,
    icon,
    tone: look.tone,
    name: t(`card.${id}.name`),
    why: t(`card.${id}.why`),
  }
}

/* The cards a chain has earned so far, in the order they fired and without
   repeats. A seven goose chain fires one goose rule, not seven: the second
   card would say exactly what the first one said, and the table would sit
   through it. */
export function cardsFor(steps: Step[]): RuleCardContent[] {
  const seen = new Set<RuleId>()
  const cards: RuleCardContent[] = []
  for (const step of steps) {
    const card = cardFor(step)
    if (card === null || seen.has(card.id)) continue
    seen.add(card.id)
    cards.push(card)
  }
  return cards
}
