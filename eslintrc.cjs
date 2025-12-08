module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // point to the tsconfig used for linting (use the tsconfig below)
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // enables rules that require type information
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier'
  ],
  rules: {
    // a short set of high-value, type-aware rules to start with
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/restrict-plus-operands': 'error',
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    // prefer explicitness for public APIs (optional)
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true, allowTypedFunctionExpressions: true }],
    // import resolver issues should be flagged
    'import/no-unresolved': 'error'
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.eslint.json'
      }
    }
  }
};