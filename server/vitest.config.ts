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
      exclude: ['src/index.ts', 'src/**/*.test.{js,ts}', 'node_modules/**'],
      thresholds: {
        statements: 80.72,
        branches: 69.61,
        functions: 82.41,
        lines: 81.19,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
  },
});
