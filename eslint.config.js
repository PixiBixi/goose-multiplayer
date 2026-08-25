import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // design/ is the pre-existing mockup generator (plain Node script, not a
    // TypeScript workspace): out of scope for this monorepo's lint policy.
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'design/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
)
