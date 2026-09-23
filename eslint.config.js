import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // design/ is the pre-existing mockup generator (plain Node script, not a
    // TypeScript workspace): out of scope for this monorepo's lint policy.
    // .claude/ holds agent worktrees: a scratch file left there must not fail
    // lint on the main checkout.
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'design/**', '.claude/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
)
