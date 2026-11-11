/* Hand-written copies of three rules in @goose/protocol's schemas: importing
   the schemas puts zod in the client bundle, for two length checks and a
   regex. limits.test.ts holds them to the server's, so they cannot drift. */
export const NAME_MAX = 24
export const CHAT_MAX = 500

const inRange = (value: string, max: number): boolean => {
  const length = value.trim().length
  return length >= 1 && length <= max
}

export const validName = (value: string): boolean => inRange(value, NAME_MAX)

export const validCode = (value: string): boolean =>
  /^[A-Z0-9]{6}$/.test(value.trim().toUpperCase())

export const validChat = (value: string): boolean => inRange(value, CHAT_MAX)
