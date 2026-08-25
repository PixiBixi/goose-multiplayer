import { z } from 'zod'

const name = z.string().trim().min(1).max(24)
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/)
/* The client mints this once and keeps it in localStorage. It is what lets a
   dropped player land back on their own seat instead of burning the grace
   period, so it travels with every way of sitting down at a table. Capped
   because it is a client-supplied map key the server holds per room. */
const session = z.string().trim().min(1).max(64)

export const clientSchemas = {
  createRoom: z.object({ name, session }),
  joinRoom: z.object({ code, name, session }),
  /* mode is deliberately absent: v1 refuses the card variant, and letting the
     schema accept it would push the refusal into the handler where it is
     easier to forget. */
  configureTable: z
    .object({
      exactFinish: z.boolean().optional(),
      twoDice: z.boolean().optional(),
      rescue: z.boolean().optional(),
      opening9: z.boolean().optional(),
      doubleAgain: z.boolean().optional(),
      /* Nullable rather than optional-as-off: `null` is the historic rescue
         only table, a real choice a host can make, and `undefined` already
         means "leave this rule alone". Capped so a host cannot set a wait
         nobody would sit through. */
      maxBlockedTurns: z.int().min(1).max(20).nullable().optional(),
      escapeOnDouble: z.boolean().optional(),
      /* Not a switch: neither value is an "off", so the wire carries the
         choice itself rather than a boolean the client would have to map. */
      tripleDouble: z.enum(['pass', 'restart']).optional(),
    })
    .strict(),
  startGame: z.object({}).strict(),
  roll: z.object({}).strict(),
  chat: z.object({ text: z.string().trim().min(1).max(500) }),
  leaveRoom: z.object({}).strict(),
  restart: z.object({}).strict(),
  /* Phase 2. Declared so the wire never has to change, refused by the handler
     while the table runs in classic mode. */
  playCard: z.object({ cardId: z.string().max(64) }).strict(),
} as const

export type ClientEvent = keyof typeof clientSchemas
