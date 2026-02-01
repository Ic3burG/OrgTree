import { test, expect } from './fixtures/test-user';

test.describe('Departments', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Create an organization for department tests
    const orgName = `Dept Test Org ${Date.now()}`;

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

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

    // Navigate to the organization
    await authenticatedPage.getByText(orgName).click();
    await authenticatedPage.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });

    // Navigate to Departments page
    await authenticatedPage.getByRole('link', { name: /departments/i }).click();
    await authenticatedPage.waitForURL(/\/departments/, { timeout: 10000 });
  });

  test('should create a department', async ({ authenticatedPage }) => {
    const deptName = `Engineering ${Date.now()}`;

    // Click add department button
    // Click add department button
    const addDeptButton = authenticatedPage.getByRole('button', { name: /add department|new department/i });
    await expect(addDeptButton).toBeVisible({ timeout: 10000 });
    await addDeptButton.click();
    await expect(authenticatedPage.getByRole('dialog')).toBeVisible();

    // Fill department name

    // Fill department name
    await authenticatedPage.getByLabel(/name/i).fill(deptName);

    // Save
    await authenticatedPage.getByRole('dialog').getByRole('button', { name: /add department|update department/i }).click();

    // Should see the department
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });
  });

  test('should edit a department', async ({ authenticatedPage }) => {
    const deptName = `Edit Test ${Date.now()}`;
    const updatedName = `Updated ${deptName}`;

    // Create a department first
    // Click add department button
    const addDeptButton = authenticatedPage.getByRole('button', { name: /add department|new department/i });
    await expect(addDeptButton).toBeVisible({ timeout: 10000 });
    await addDeptButton.click();
    await expect(authenticatedPage.getByRole('dialog')).toBeVisible();

    // Fill department name
    await authenticatedPage.getByLabel(/name/i).fill(deptName);
    await authenticatedPage.getByRole('dialog').getByRole('button', { name: /add department|update department/i }).click();

    // Wait for it to appear
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });

    // Find and click edit (may need to hover or click on department)
    await authenticatedPage.getByText(deptName).click();
    await authenticatedPage.getByRole('button', { name: /^edit/i }).click();

    // Update name
    await authenticatedPage.getByLabel(/name/i).fill(updatedName);
    await authenticatedPage.getByRole('dialog').getByRole('button', { name: /add department|update department/i }).click();

    // Should see updated name
    await expect(authenticatedPage.getByText(updatedName)).toBeVisible({ timeout: 10000 });
  });

  test('should delete a department', async ({ authenticatedPage }) => {
    const deptName = `Delete Test ${Date.now()}`;

    // Create a department
    // Click add department button
    const addDeptButton = authenticatedPage.getByRole('button', { name: /add department|new department/i });
    await expect(addDeptButton).toBeVisible({ timeout: 10000 });
    await addDeptButton.click();
    await expect(authenticatedPage.getByRole('dialog')).toBeVisible();

    // Fill department name
    await authenticatedPage.getByLabel(/name/i).fill(deptName);
    await authenticatedPage.getByRole('dialog').getByRole('button', { name: /add department|update department/i }).click();

    // Wait for it to appear
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });

    // Delete it
    await authenticatedPage.getByText(deptName).click();
    await authenticatedPage.getByRole('button', { name: /^delete/i }).click();

    // Confirm deletion if there's a dialog
    const confirmButton = authenticatedPage.getByRole('dialog').getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await expect(authenticatedPage.getByRole('dialog')).not.toBeVisible();
    }

    // Should no longer see the department
    await expect(authenticatedPage.getByText(deptName)).not.toBeVisible({ timeout: 10000 });
  });
});
