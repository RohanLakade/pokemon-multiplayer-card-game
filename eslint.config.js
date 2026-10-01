import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['**/dist', '**/node_modules', '**/coverage']),

  // Rules for every JS file in the repo
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Capitalised names are allowed because JSX usage like <App /> is not seen as "used"
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // Browser code: React rules and browser globals
  {
    files: ['client/**/*.{js,jsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // Node code: server, shared, scripts and config files
  {
    files: [
      'server/**/*.js',
      'shared/**/*.js',
      'scripts/**/*.js',
      '*.config.js',
      'client/*.config.js',
    ],
    languageOptions: { globals: globals.node },
  },

  // Must be last: switches off ESLint rules that clash with Prettier
  prettier,
]);
