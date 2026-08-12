module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parser: 'espree',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: 'eslint:recommended',
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'no-console': 'warn'
  },
  ignorePatterns: ['node_modules', 'dist', 'functions/node_modules']
};
