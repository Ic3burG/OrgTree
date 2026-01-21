import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'backups/**', '*.db'],
  },

  // Base JavaScript config
  js.configs.recommended,

  // Node.js and TypeScript configuration
  {
    files: ['src/**/*.{js,ts}', 'scripts/**/*.{js,ts}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      // TypeScript rules
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // General rules
      'no-unused-vars': 'off', // Using TypeScript version instead
      'no-console': 'off', // Allow console in Node.js
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',
    },
  },

  // Test files configuration
  {
    files: ['src/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        test: 'readonly',
        require: 'readonly',
        global: 'writable',
      },
    },
    rules: {
      // Allow 'any' types in test files for mocking and test scenarios
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Prettier config (must be last)
  prettierConfig,
];
