import { test, expect } from './fixtures/test-user';

test.describe('Departments', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Create an organization for department tests
    const orgName = `Dept Test Org ${Date.now()}`;

    await authenticatedPage
      .getByRole('button', { name: /create|new|add/i })
      .first()
      .click();
    await authenticatedPage.getByLabel(/name/i).fill(orgName);
    await authenticatedPage.getByRole('button', { name: /create|save|submit/i }).click();

    // Navigate to the organization
    await authenticatedPage.getByText(orgName).click();
    await authenticatedPage.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });
  });

  test('should create a department', async ({ authenticatedPage }) => {
    const deptName = `Engineering ${Date.now()}`;

    // Click add department button
    await authenticatedPage.getByRole('button', { name: /add department|new department/i }).click();

    // Fill department name
    await authenticatedPage.getByLabel(/name/i).fill(deptName);

    // Save
    await authenticatedPage.getByRole('button', { name: /save|create|add/i }).click();

    // Should see the department
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });
  });

  test('should edit a department', async ({ authenticatedPage }) => {
    const deptName = `Edit Test ${Date.now()}`;
    const updatedName = `Updated ${deptName}`;

    // Create a department first
    await authenticatedPage.getByRole('button', { name: /add department|new department/i }).click();
    await authenticatedPage.getByLabel(/name/i).fill(deptName);
    await authenticatedPage.getByRole('button', { name: /save|create|add/i }).click();

    // Wait for it to appear
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });

    // Find and click edit (may need to hover or click on department)
    await authenticatedPage.getByText(deptName).click();
    await authenticatedPage.getByRole('button', { name: /edit/i }).click();

    // Update name
    await authenticatedPage.getByLabel(/name/i).fill(updatedName);
    await authenticatedPage.getByRole('button', { name: /save|update/i }).click();

    // Should see updated name
    await expect(authenticatedPage.getByText(updatedName)).toBeVisible({ timeout: 10000 });
  });

  test('should delete a department', async ({ authenticatedPage }) => {
    const deptName = `Delete Test ${Date.now()}`;

    // Create a department
    await authenticatedPage.getByRole('button', { name: /add department|new department/i }).click();
    await authenticatedPage.getByLabel(/name/i).fill(deptName);
    await authenticatedPage.getByRole('button', { name: /save|create|add/i }).click();

    // Wait for it to appear
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });

    // Delete it
    await authenticatedPage.getByText(deptName).click();
    await authenticatedPage.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion if there's a dialog
    const confirmButton = authenticatedPage.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should no longer see the department
    await expect(authenticatedPage.getByText(deptName)).not.toBeVisible({ timeout: 10000 });
  });
});
