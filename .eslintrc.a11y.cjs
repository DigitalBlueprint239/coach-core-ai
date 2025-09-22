module.exports = {
  extends: ['plugin:jsx-a11y/recommended'],
  plugins: ['jsx-a11y'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'jsx-a11y/control-has-associated-label': 'error',
    'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 3 }],
    'jsx-a11y/button-has-content': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.venv/',
    'coverage/',
    'cypress/',
    'public/',
    '**/*.d.ts',
    '**/*.js',
  ],
};

