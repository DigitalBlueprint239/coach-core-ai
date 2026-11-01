// ESLint flat config. Mirrors what Create React App enforced (hooks rules, unused variables, accessibility)
// and no more. `npm run lint` fails on any warning, locally and in CI.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

const unusedVarsOptions = {
  args: 'after-used',
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrors: 'none',
  ignoreRestSiblings: true,
};

export default [
  {
    ignores: ['build/**', 'node_modules/**', 'src/_archived/**', 'src/components/SmartPlaybook/src/**'],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // The typescript-eslint parser for .js too: its scope analysis counts JSX usage (<Icon />) as a use,
    // which core ESLint does not (CRA needed eslint-plugin-react's jsx-uses-vars for that).
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-unused-vars': ['warn', unusedVarsOptions],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', unusedVarsOptions],
    },
  },
];
