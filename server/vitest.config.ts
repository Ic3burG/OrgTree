import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/index.ts',
        'src/**/*.test.{js,ts}',
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
