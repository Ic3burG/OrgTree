import { test, expect } from './fixtures/test-user';

test.describe('People', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Create an organization and department for people tests
    const orgName = `People Test Org ${Date.now()}`;
    const deptName = `Test Department ${Date.now()}`;

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Create org
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

    // Navigate to org
    await authenticatedPage.getByText(orgName).click();
    await authenticatedPage.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });

    // Create a department
    const addDeptButton = authenticatedPage.getByRole('button', { name: /add department|new department/i });
    await expect(addDeptButton).toBeVisible({ timeout: 10000 });
    await addDeptButton.click();
    await authenticatedPage.getByLabel(/name/i).fill(deptName);
    await authenticatedPage.getByRole('button', { name: /save|create|add/i }).click();

    // Wait for department to appear
    await expect(authenticatedPage.getByText(deptName)).toBeVisible({ timeout: 10000 });
  });

  test('should add a person to a department', async ({ authenticatedPage }) => {
    const personName = `John Doe ${Date.now()}`;
    const personEmail = `john.doe.${Date.now()}@example.com`;

    // Click on department to select it, then add person
    await authenticatedPage
      .getByRole('button', { name: /add person|add member/i })
      .first()
      .click();

    // Fill person details
    await authenticatedPage.getByLabel(/name/i).fill(personName);
    await authenticatedPage.getByLabel(/email/i).fill(personEmail);

    // Save
    await authenticatedPage.getByRole('button', { name: /save|add|create/i }).click();

    // Should see the person
    await expect(authenticatedPage.getByText(personName)).toBeVisible({ timeout: 10000 });
  });

  test('should edit a person', async ({ authenticatedPage }) => {
    const personName = `Edit Person ${Date.now()}`;
    const updatedName = `Updated ${personName}`;

    // Add a person first
    await authenticatedPage
      .getByRole('button', { name: /add person|add member/i })
      .first()
      .click();
    await authenticatedPage.getByLabel(/name/i).fill(personName);
    await authenticatedPage.getByRole('button', { name: /save|add|create/i }).click();

    // Wait for person to appear
    await expect(authenticatedPage.getByText(personName)).toBeVisible({ timeout: 10000 });

    // Edit the person
    await authenticatedPage.getByText(personName).click();
    await authenticatedPage.getByRole('button', { name: /edit/i }).click();

    // Update name
    await authenticatedPage.getByLabel(/name/i).fill(updatedName);
    await authenticatedPage.getByRole('button', { name: /save|update/i }).click();

    // Should see updated name
    await expect(authenticatedPage.getByText(updatedName)).toBeVisible({ timeout: 10000 });
  });

  test('should delete a person', async ({ authenticatedPage }) => {
    const personName = `Delete Person ${Date.now()}`;

    // Add a person
    await authenticatedPage
      .getByRole('button', { name: /add person|add member/i })
      .first()
      .click();
    await authenticatedPage.getByLabel(/name/i).fill(personName);
    await authenticatedPage.getByRole('button', { name: /save|add|create/i }).click();

    // Wait for person to appear
    await expect(authenticatedPage.getByText(personName)).toBeVisible({ timeout: 10000 });

    // Delete the person
    await authenticatedPage.getByText(personName).click();
    await authenticatedPage.getByRole('button', { name: /delete/i }).click();

    // Confirm if needed
    const confirmButton = authenticatedPage.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should no longer see the person
    await expect(authenticatedPage.getByText(personName)).not.toBeVisible({ timeout: 10000 });
  });
});
