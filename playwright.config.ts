import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for OrgTree E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [['html', { open: 'never' }], ['list']],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.CI ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on first retry */
    video: 'on-first-retry',

    /* Increase default timeout for actions (30s is default, 60s for complex apps) */
    actionTimeout: 15000,

    /* Increase default navigation timeout */
    navigationTimeout: 30000,
  },

  /* Global timeout for each test */
  timeout: 120000, // 2 minutes per test

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000, // 10s for assertions
  },

  /* Configure projects - Chromium only for stability */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /*
   * Run your local dev server before starting the tests
   * NOTE: If you have Node version compatibility issues, start servers manually:
   *   Terminal 1: npm run dev
   *   Terminal 2: cd server && npm run dev
   * Then run: npm run test:e2e
   */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: process.env.CI ? 'cd server && npx tsx --import ./src/instrument.ts src/index.ts' : 'cd server && npm run dev',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],

  /* Output directory for test artifacts */
  outputDir: 'test-results/',
});
