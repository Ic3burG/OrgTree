import { test as base, expect } from '@playwright/test';

const test = base.extend({
  // Override page to not use the fixture's auto-login if it conflicts,
  // but actually we just want a clean page.
});

test.describe('Performance Benchmark', () => {
  const LARGE_ORG_ID = 'baea69f4-b728-4169-92d3-c86585cd7839';
  const SEED_USER = 'api-seed-1768184569155@example.com';
  const TEMP_PASS = 'SecurePassword123!';
  const NEW_PASS = 'NewSecurePassword123!';

  test('measure large organization load', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(SEED_USER);
    await page.getByLabel('Password').fill(TEMP_PASS);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Wait for redirect (can be / for OrganizationSelector or /dashboard)
    await page.waitForURL(
      url =>
        url.pathname === '/' ||
        url.pathname.includes('organizations') ||
        url.pathname.includes('dashboard'),
      { timeout: 30000 }
    );
    console.log('Logged in, URL:', page.url());

    // 2. Navigate to large org
    console.log('Navigating to Large Org...');
    const start = Date.now();
    await page.goto(`/org/${LARGE_ORG_ID}/people`);

    // Wait for the "People" header
    await expect(page.getByText('Manage people across all departments')).toBeVisible({
      timeout: 60000,
    });
    const shellLoaded = Date.now();
    console.log(`Shell loaded in ${shellLoaded - start}ms`);

    // Wait for loading spinner to disappear
    await expect(page.getByText('Loading people...'), { timeout: 120000 }).not.toBeVisible();

    // Wait for at least one person to appear in the list
    // PersonItem has h3 with text-lg font-semibold inside the divide-y container
    const firstPerson = page.locator('.divide-y h3.text-lg.font-semibold').first();
    await expect(firstPerson).toBeVisible({ timeout: 120000 });

    const fullyLoaded = Date.now();
    const loadTime = fullyLoaded - start;
    const renderTime = fullyLoaded - shellLoaded;

    console.log(`----------------------------------------`);
    console.log(`BENCHMARK RESULTS for ${LARGE_ORG_ID}`);
    console.log(`Total load time: ${loadTime}ms`);
    console.log(`Shell load time: ${shellLoaded - start}ms`);
    console.log(`Data render time: ${renderTime}ms`);
    console.log(`----------------------------------------`);

    // Verify some data is actually there
    const count = await page.locator('.divide-y h3.text-lg.font-semibold').count();
    console.log(`Visible people on first page: ${count}`);
  });
});
