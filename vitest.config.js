import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // Handle ES module dependencies
    deps: {
      inline: [
        '@exodus/bytes',
        'html-encoding-sniffer'
      ]
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'node_modules/**'
      ],
      thresholds: {
        statements: 5,
        branches: 2,
        functions: 5,
        lines: 5
      }
    }
  }
});
