import { test, expect } from './fixtures/test-user';

test.describe('Organizations', () => {
  test('should display organization selector after login', async ({ authenticatedPage }) => {
    // Should show organizations page or create org prompt
    // Use .first() to handle cases where multiple matching headings might exist (e.g., both "Welcome" and "Your Organizations")
    await expect(
      authenticatedPage.getByRole('heading', { name: /organization|welcome/i }).first()
    ).toBeVisible();
  });

  test('should create a new organization', async ({ authenticatedPage }) => {
    const orgName = `Test Org ${Date.now()}`;

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Click create organization button
    const createButton = authenticatedPage.getByRole('button', {
      name: /new organization|create your first organization/i,
    });
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
    await createButton.first().click({ force: true });

    // Wait a moment for the click to trigger and dialog to start opening
    await authenticatedPage.waitForTimeout(500);

    // Wait for the dialog to be fully visible
    const createDialog = authenticatedPage.getByRole('dialog');
    await expect(createDialog).toBeVisible({ timeout: 10000 });

    // Fill in organization name
    await createDialog.getByLabel(/name/i).fill(orgName);

    // Submit
    await createDialog.getByRole('button', { name: /create|save|submit/i }).click();

    // Should see the new organization
    await expect(authenticatedPage.getByText(orgName)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to organization dashboard', async ({ authenticatedPage }) => {
    const orgName = `Dashboard Test ${Date.now()}`;

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Create an organization first
    const createButton = authenticatedPage.getByRole('button', {
      name: /new organization|create your first organization/i,
    });
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
    await createButton.first().click({ force: true });

    // Wait a moment for the click to trigger and dialog to start opening
    await authenticatedPage.waitForTimeout(500);

    // Wait for the dialog to be fully visible
    const createDialog = authenticatedPage.getByRole('dialog');
    await expect(createDialog).toBeVisible({ timeout: 10000 });

    await createDialog.getByLabel(/name/i).fill(orgName);
    await createDialog.getByRole('button', { name: /create|save|submit/i }).click();

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
