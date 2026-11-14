import typescriptParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "no-unused-vars": ["error", {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": true,
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_"
      }]
    }
  },
  eslintConfigPrettier,
]
