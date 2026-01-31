import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{js,jsx,ts,tsx}', 'node_modules/**'],
      thresholds: {
        statements: 20,
        branches: 20,
        functions: 20,
        lines: 20,
      },
    },
  },
});
