module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
    'plugin:import/warnings',
    'plugin:import/errors',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      [require.resolve('eslint-import-resolver-typescript')]: {},
      node: {},
    },
  },
  root: true,
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    'prettier/prettier': 'error',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    'no-console': 'error',
    'keyword-spacing': 'error',
    'space-before-blocks': 'error',
    'arrow-spacing': 'error',
    'key-spacing': 'error',
    'switch-colon-spacing': 'error',
    'semi-spacing': 'error',
    'comma-spacing': 'error',
    'func-call-spacing': 'error',
    'no-multi-spaces': ['error', { ignoreEOLComments: true }],
    'object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    yoda: 'warn',
    'import/newline-after-import': 'warn',
    'import/no-cycle': 'off',
    'import/order': 'warn',
    'import/no-named-as-default-member': 'off',
  },
};
