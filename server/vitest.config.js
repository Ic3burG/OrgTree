import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/index.js',
        'src/**/*.test.js',
        'node_modules/**'
      ],
      thresholds: {
        statements: 10,
        branches: 5,
        functions: 10,
        lines: 10
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
