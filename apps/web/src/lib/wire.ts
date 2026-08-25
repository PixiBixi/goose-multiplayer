import type { BlockReason, TripleDouble } from '@goose/engine'

/* The wire is a version boundary. A tab that was loaded before a deploy keeps
   running the bundle it downloaded, and the server it is talking to has moved
   on: it receives step kinds, reasons and outcomes its own copy of the types
   has never heard of. Compile-time exhaustiveness is a promise about the code
   that shipped, never about the messages that arrive.

   So every switch on a value that came off the server ends here: the value is
   passed as `never`, which still fails the build when a case is missing, and
   at runtime a fallback is returned instead of falling off the end of the
   function. Do NOT widen the parameter to the union to make an addition
   build: that trades a crash for a silent gap. */
export function unknownWireValue<T>(_value: never, fallback: T): T {
  return fallback
}

/** The trap a block reason names, or null for one this bundle cannot name. */
export function trapOf(reason: BlockReason): 'well' | 'prison' | null {
  switch (reason) {
    case 'well':
      return 'well'
    case 'prison':
      return 'prison'
    default:
      return unknownWireValue(reason, null)
  }
}

/** What a third double cost the seat, or null for an outcome we cannot name. */
export function outcomeOf(outcome: TripleDouble): 'pass' | 'restart' | null {
  switch (outcome) {
    case 'pass':
      return 'pass'
    case 'restart':
      return 'restart'
    default:
      return unknownWireValue(outcome, null)
  }
}
