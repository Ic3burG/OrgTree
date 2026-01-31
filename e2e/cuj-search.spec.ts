import { test, expect } from './fixtures/test-user';

test.describe('CUJ-2: Search & Discovery', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Setup: Create Org and populate
    const timestamp = Date.now();
    const orgName = `Search Test Org ${timestamp}`;
    const deptName = `Engineering ${timestamp}`;
    const personName = `Alice Searchable ${timestamp}`;

    // Create Org
    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Handle both empty state ("Create Your First Organization") and header button ("New Organization")
    // Use .first() to handle cases where both buttons temporarily exist during page load
    const createOrgButton = authenticatedPage.getByRole('button', {
      name: /new organization|create your first organization/i,
    });
    // Wait for button to be visible and clickable
    await expect(createOrgButton.first()).toBeVisible({ timeout: 10000 });
    await createOrgButton.first().click();

    // Wait a moment for the click to trigger and dialog to start opening
    await authenticatedPage.waitForTimeout(500);

    const createDialog = authenticatedPage.getByRole('dialog');
    await expect(createDialog).toBeVisible({ timeout: 10000 });

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

    await authenticatedPage
      .getByRole('button', { name: /add person/i })
      .first()
      .click();

    const personDialog = authenticatedPage.getByRole('dialog');
    await expect(personDialog).toBeVisible({ timeout: 5000 });

    await personDialog.getByLabel(/^full name/i).fill(personName);
    await personDialog.getByRole('button', { name: /^add person$/i }).click();
    await expect(personDialog).not.toBeVisible({ timeout: 5000 });

    await expect(authenticatedPage.getByText(personName).first()).toBeVisible({ timeout: 10000 });
  });

  test('Global Search, Filtering and Navigation', async ({ authenticatedPage }) => {
    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Find the search input - may be searching for departments or people
    const searchInput = authenticatedPage.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // 1. Search for Person - wait for debounce
    await searchInput.fill('Alice Searchable');
    await authenticatedPage.waitForTimeout(500); // Wait for debounce (300ms + buffer)

    // Wait for search results to appear
    await expect(
      authenticatedPage.getByRole('button', { name: /Alice Searchable/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // 2. Filter by Departments - first clear the search to reset
    await searchInput.clear();
    await authenticatedPage.waitForTimeout(500);

    // Re-search
    await searchInput.fill('Alice Searchable');
    await authenticatedPage.waitForTimeout(500);

    // Click filter dropdown
    const filterButton = authenticatedPage.getByLabel(/filter search type/i);
    await expect(filterButton).toBeVisible({ timeout: 3000 });
    await filterButton.click();

    // Select Departments filter
    await authenticatedPage
      .getByRole('button', { name: /^departments$/i })
      .click({ timeout: 3000 });

    // Alice should NOT be visible when filtering by departments
    await expect(
      authenticatedPage.getByRole('button', { name: /Alice Searchable/i })
    ).not.toBeVisible({ timeout: 5000 });

    // 3. Filter by People
    await filterButton.click();
    await authenticatedPage.getByRole('button', { name: /^people$/i }).click({ timeout: 3000 });

    // Alice should be visible again
    await expect(
      authenticatedPage.getByRole('button', { name: /Alice Searchable/i }).first()
    ).toBeVisible({ timeout: 10000 });

    // 4. Navigation - click on the search result
    await authenticatedPage
      .getByRole('button', { name: /Alice Searchable/i })
      .first()
      .click();

    // Verify navigation - may show as heading or in details panel
    // Give it time to navigate or show details
    await authenticatedPage.waitForTimeout(1000);

    // Person details should be visible (could be in a panel or heading)
    await expect(authenticatedPage.locator('text=Alice Searchable').first()).toBeVisible({
      timeout: 5000,
    });
  });
});
