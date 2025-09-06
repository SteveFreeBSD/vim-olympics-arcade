import js from '@eslint/js'
import globals from 'globals'
import pluginReact from 'eslint-plugin-react'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.browser,
    },
    // Ensure eslint-plugin-react can auto-detect the version across the repo
    settings: { react: { version: 'detect' } },
  },
  pluginReact.configs.flat.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    settings: { react: { version: 'detect' } },
    rules: {
      // Allow intentional empty catch blocks used for graceful fallbacks
      'no-empty': ['error', { allowEmptyCatch: true }],
      // We don't use PropTypes; UI is small and self-contained
      'react/prop-types': 'off',
      // We intentionally filter control chars in lesson validation
      'no-control-regex': 'off',
    },
  },
  {
    files: ['src/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Vitest globals
        vi: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
      },
    },
  },
])
