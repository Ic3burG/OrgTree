import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('landing page visual', async ({ page }) => {
    // Go to landing page
    await page.goto('/');

    // Wait for network to be idle to ensure assets loaded
    await page.waitForLoadState('networkidle');

    // Take screenshot and compare with baseline
    await expect(page).toHaveScreenshot('landing-page.png');
  });

  test('org map visual', async ({ page }) => {
    // Navigate to org map - mocking auth or state might be needed if behind login
    // For now, assuming we land on public page or can navigate
    await page.goto('/');

    // Check if we need to navigate to map
    // Use a more robust selector if needed
    const mapLink = page.getByText('Org Map', { exact: false });
    if (await mapLink.isVisible()) {
      await mapLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('org-map.png');
    }
  });
});
