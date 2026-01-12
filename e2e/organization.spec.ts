import { test, expect } from './fixtures/test-user';

test.describe('Organizations', () => {
  test('should display organization selector after login', async ({ authenticatedPage }) => {
    // Should show organizations page or create org prompt
    await expect(
      authenticatedPage.getByRole('heading', { name: /organization|welcome/i })
    ).toBeVisible();
  });

  test('should create a new organization', async ({ authenticatedPage }) => {
    const orgName = `Test Org ${Date.now()}`;
    
    // Click create organization button
    await authenticatedPage.getByRole('button', { name: /create|new|add/i }).first().click();
    
    // Fill in organization name
    await authenticatedPage.getByLabel(/name/i).fill(orgName);
    
    // Submit
    await authenticatedPage.getByRole('button', { name: /create|save|submit/i }).click();
    
    // Should see the new organization
    await expect(authenticatedPage.getByText(orgName)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to organization dashboard', async ({ authenticatedPage }) => {
    const orgName = `Dashboard Test ${Date.now()}`;
    
    // Create an organization first
    await authenticatedPage.getByRole('button', { name: /create|new|add/i }).first().click();
    await authenticatedPage.getByLabel(/name/i).fill(orgName);
    await authenticatedPage.getByRole('button', { name: /create|save|submit/i }).click();
    
    // Wait for org to appear and click it
    await authenticatedPage.getByText(orgName).click();
    
    // Should navigate to organization view
    await authenticatedPage.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });
    
    // Should show organization content (dashboard, chart, etc.)
    await expect(
      authenticatedPage.getByRole('heading').filter({ hasText: new RegExp(orgName, 'i') })
    ).toBeVisible();
  });
});
