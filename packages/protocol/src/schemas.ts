import { z } from 'zod'

const name = z.string().trim().min(1).max(24)
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/)

export const clientSchemas = {
  createRoom: z.object({ name }),
  joinRoom: z.object({ code, name }),
  /* mode is deliberately absent: v1 refuses the card variant, and letting the
     schema accept it would push the refusal into the handler where it is
     easier to forget. */
  configureTable: z
    .object({
      exactFinish: z.boolean().optional(),
      twoDice: z.boolean().optional(),
      rescue: z.boolean().optional(),
      opening9: z.boolean().optional(),
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
