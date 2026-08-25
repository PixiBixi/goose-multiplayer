import { compose } from './stack.js'

export default function globalTeardown(): void {
  /* -v as well: the stack owns its network, and leaving it behind makes the
     next run join a network Traefik is no longer watching. */
  compose('down', '-v')
}
