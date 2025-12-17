import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  {
    ignores: ['**/dist/'],
  },
  ...compat.extends('prettier', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 13,
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/no-non-null-assertion': 1,
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-async-promise-executor': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
