module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2022
  },
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-throw-literal': 'error',
    'prefer-const': 'warn'
  },
  ignorePatterns: ['node_modules/', 'coverage/', 'logs/', 'n8n/', 'sample-app/fixed-reference/']
};
