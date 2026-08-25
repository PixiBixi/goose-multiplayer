import type { JSX } from 'react'
import { t } from '../i18n/index.js'
import type { RuleCardContent } from '../lib/rule-cards.js'
import { SquareIcon } from './SquareIcon.js'

export type RuleCardProps = {
  card: RuleCardContent
  onDismiss: () => void
}

/* Beside the board, never over it. A card that covers the spiral hides the
   pawn that just moved, which is the one thing the player is looking at while
   the rule is being explained.

   The whole card is the dismiss target: a small cross would be a 24px hit
   area on a rule nobody asked for. role="status" so a screen reader is told
   the rule without the focus being stolen from the roll button. */
export function RuleCard({ card, onDismiss }: RuleCardProps): JSX.Element {
  return (
    <div className="rule-card-slot" role="status">
      <button
        type="button"
        className="rule-card"
        data-testid="rule-card"
        data-rule={card.id}
        data-tone={card.tone}
        title={t('card.dismiss')}
        onClick={onDismiss}
      >
        <span className="rule-card-mark" aria-hidden="true">
          <SquareIcon name={card.icon} size={26} />
        </span>
        <span className="rule-card-text">
          <span className="rule-card-eyebrow">{t('card.eyebrow')}</span>
          <span className="rule-card-name">{card.name}</span>
          <span className="rule-card-why">{card.why}</span>
        </span>
      </button>
    </div>
  )
}
