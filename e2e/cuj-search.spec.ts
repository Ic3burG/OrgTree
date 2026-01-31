import { test, expect } from './fixtures/test-user';

test.describe('CUJ-2: Search & Discovery', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Setup: Create Org and populate
    const timestamp = Date.now();
    const orgName = `Search Test Org ${timestamp}`;
    const deptName = `Engineering ${timestamp}`;
    const personName = `Alice Searchable ${timestamp}`;

    // Create Org
    await authenticatedPage.getByRole('button', { name: /new organization/i }).click();

    const createDialog = authenticatedPage.getByRole('dialog');
    await expect(createDialog).toBeVisible({ timeout: 5000 });

    await createDialog.getByLabel(/organization name/i).fill(orgName);
    await createDialog.getByRole('button', { name: /^create organization$/i }).click();

    await expect(authenticatedPage.getByText(orgName).first()).toBeVisible({ timeout: 15000 });
    await authenticatedPage.getByText(orgName).first().click();
    await authenticatedPage.waitForURL(/\/org\/[^/]+/, { timeout: 15000 });

    // Add Dept
    await authenticatedPage.getByRole('link', { name: /^departments$/i }).click();
    await authenticatedPage.waitForURL(/\/departments/, { timeout: 15000 });
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    await authenticatedPage.getByRole('button', { name: /add department/i }).click();

    const deptDialog = authenticatedPage.getByRole('dialog');
    await expect(deptDialog).toBeVisible({ timeout: 5000 });

    await deptDialog.getByLabel(/^department name/i).fill(deptName);
    await deptDialog.getByRole('button', { name: /^add department$/i }).click();
    await expect(deptDialog).not.toBeVisible({ timeout: 5000 });

    await expect(authenticatedPage.getByText(deptName).first()).toBeVisible({ timeout: 10000 });

    // Add Person
    await authenticatedPage.getByText(deptName).first().click();
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.getByRole('button', { name: /add person/i }).first().click();

    const personDialog = authenticatedPage.getByRole('dialog');
    await expect(personDialog).toBeVisible({ timeout: 5000 });

    await personDialog.getByLabel(/^full name/i).fill(personName);
    await personDialog.getByRole('button', { name: /^add person$/i }).click();
    await expect(personDialog).not.toBeVisible({ timeout: 5000 });

    await expect(authenticatedPage.getByText(personName).first()).toBeVisible({ timeout: 10000 });
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
