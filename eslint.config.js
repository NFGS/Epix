import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Guard de capas (R-17): dominio y aplicación no conocen framework,
    // presentación ni adaptadores concretos. Los tests pueden usar dobles.
    files: ['src/domain/**/*.{ts,tsx}', 'src/application/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react-router-dom',
                'react/*',
                'react-dom/*',
                'react-router-dom/*',
                'dexie',
                'dexie/*',
                'dexie-react-hooks',
                '@supabase/*',
                '@/presentation/*',
                '@/infrastructure/*',
              ],
              message:
                'Las capas domain/application no pueden depender de framework, presentación ni infraestructura (Clean Architecture).',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
);
