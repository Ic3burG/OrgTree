import { test, expect } from './fixtures/test-user';

test.describe('CUJ-2: Search & Discovery', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Setup: Create Org and populate
    const timestamp = Date.now();
    const orgName = `Search Test Org ${timestamp}`;
    const deptName = `Engineering ${timestamp}`;
    const personName = `Alice Searchable ${timestamp}`;

    // Create Org
    await authenticatedPage
      .getByRole('button', { name: /create|new|add/i })
      .first()
      .click();
    await authenticatedPage.getByLabel(/name/i).fill(orgName);
    const createDialog = authenticatedPage.getByRole('dialog');
    if (await createDialog.isVisible()) {
      await createDialog.getByRole('button', { name: 'Create Organization' }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: 'Create Organization' }).click();
    }
    await expect(authenticatedPage.getByText(orgName)).toBeVisible({ timeout: 10000 });
    await authenticatedPage.getByText(orgName).click();

    // Add Dept
    await authenticatedPage.getByRole('link', { name: /departments/i }).click();
    await authenticatedPage.waitForURL(/\/departments/);

    await authenticatedPage.getByRole('button', { name: /add department|new department/i }).click();
    await authenticatedPage.getByLabel(/name/i).fill(deptName);
    const deptDialog = authenticatedPage.getByRole('dialog');
    if (await deptDialog.isVisible()) {
      await deptDialog.getByRole('button', { name: 'Add Department', exact: true }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: 'Add Department', exact: true }).click();
    }
    await expect(authenticatedPage.getByText(deptName)).toBeVisible();

    // Add Person
    await authenticatedPage.getByText(deptName).click();
    await authenticatedPage
      .getByRole('button', { name: /add person|add member/i })
      .first()
      .click();
    await authenticatedPage.getByLabel(/name/i).fill(personName);
    const personDialog = authenticatedPage.getByRole('dialog');
    if (await personDialog.isVisible()) {
      await personDialog.getByRole('button', { name: /save|add member|create/i }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: /save|add member|create/i }).click();
    }
    await expect(authenticatedPage.getByText(personName)).toBeVisible();
  });

  test('Global Search, Filtering and Navigation', async ({ authenticatedPage }) => {
    const searchInput = authenticatedPage.getByPlaceholder(/search departments/i);
    await expect(searchInput).toBeVisible();

    // 1. Search for Person
    await searchInput.fill('Alice Searchable');
    await expect(
      authenticatedPage.getByRole('button', { name: /Alice Searchable/i })
    ).toBeVisible();

    // 2. Filter by Departments
    await authenticatedPage.getByLabel(/filter search type/i).click();
    await authenticatedPage.getByRole('button', { name: 'Departments', exact: true }).click();
    await expect(
      authenticatedPage.getByRole('button', { name: /Alice Searchable/i })
    ).not.toBeVisible();

    // 3. Filter by People
    await authenticatedPage.getByLabel(/filter search type/i).click();
    await authenticatedPage.getByRole('button', { name: 'People', exact: true }).click();
    await expect(
      authenticatedPage.getByRole('button', { name: /Alice Searchable/i })
    ).toBeVisible();

    // 4. Navigation
    await authenticatedPage.getByRole('button', { name: /Alice Searchable/i }).click();
    await expect(
      authenticatedPage.getByRole('heading', { name: /Alice Searchable/i })
    ).toBeVisible();
  });
});
