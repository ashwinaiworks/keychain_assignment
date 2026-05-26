// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    ignores: ['node_modules/**'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Catch forgotten awaits — the most common agent mistake in async tests
      '@typescript-eslint/no-floating-promises': 'error',

      // Disallow any — keeps the typed API client honest
      '@typescript-eslint/no-explicit-any': 'warn',

      // Catch unused imports that agents sometimes leave behind
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Prefer explicit return types on public API surface
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
