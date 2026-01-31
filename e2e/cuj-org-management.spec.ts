import { test, expect } from './fixtures/test-user';

test.describe('CUJ-1: Organization Management', () => {
  test('Complete Organization Lifecycle', async ({ authenticatedPage }) => {
    // 1. Setup: Define unique names
    const timestamp = Date.now();
    const orgName = `CUJ Org ${timestamp}`;
    const engineeringDept = `Engineering ${timestamp}`;
    const frontendDept = `Frontend ${timestamp}`;
    const personName = `Alice Dev ${timestamp}`;
    const personEmail = `alice.${timestamp}@example.com`;

    // 2. Create Organization
    console.log('Step 1: Creating Organization');
    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Click the organization creation button (handles both empty state and header button)
    // Empty state: "Create Your First Organization"
    // Header state: "New Organization"
    // Use .first() to handle cases where both buttons temporarily exist during page load
    const createOrgButton = authenticatedPage.getByRole('button', {
      name: /new organization|create your first organization/i,
    });
    // Wait for button to be visible and clickable
    await expect(createOrgButton.first()).toBeVisible({ timeout: 10000 });
    await createOrgButton.first().click();

    // Wait a moment for the click to trigger and dialog to start opening
    await authenticatedPage.waitForTimeout(500);

    // Wait for the dialog to be fully visible
    const createDialog = authenticatedPage.getByRole('dialog');
    await expect(createDialog).toBeVisible({ timeout: 10000 });

    // Fill in the organization name using the specific label
    await createDialog.getByLabel(/organization name/i).fill(orgName);

    // Click the Create Organization button within the dialog
    await createDialog.getByRole('button', { name: /^create organization$/i }).click();

    // Wait for navigation and verify org appears in the list
    await expect(authenticatedPage.getByText(orgName).first()).toBeVisible({ timeout: 15000 });

    // Click on the organization card to navigate
    await authenticatedPage.getByText(orgName).first().click();
    await authenticatedPage.waitForURL(/\/org\/[^/]+/, { timeout: 15000 });

    // 3. Add Top-Level Department (Engineering)
    console.log('Step 2: Adding Top-Level Department');
    // Navigate to Departments page to ensure button is visible
    await authenticatedPage.getByRole('link', { name: /^departments$/i }).click();
    await authenticatedPage.waitForURL(/\/departments/, { timeout: 15000 });

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 10000 });

    // Click Add Department button
    await authenticatedPage.getByRole('button', { name: /add department/i }).click();

    // Wait for dialog to appear
    const deptDialog = authenticatedPage.getByRole('dialog');
    await expect(deptDialog).toBeVisible({ timeout: 5000 });

    // Fill in department name - use specific label to avoid conflicts
    await deptDialog.getByLabel(/^department name/i).fill(engineeringDept);

    // Click the Add Department button within the dialog
    await deptDialog.getByRole('button', { name: /^add department$/i }).click();

    // Wait for dialog to close
    await expect(deptDialog).not.toBeVisible({ timeout: 5000 });

    // Verify department appears in the list
    await expect(authenticatedPage.getByText(engineeringDept).first()).toBeVisible({
      timeout: 10000,
    });

    // 4. Add Another Department (Frontend)
    console.log('Step 3: Adding Second Department');
    await authenticatedPage.getByRole('button', { name: /add department/i }).click();

    // Wait for dialog
    await expect(deptDialog).toBeVisible({ timeout: 5000 });

    await deptDialog.getByLabel(/^department name/i).fill(frontendDept);
    await deptDialog.getByRole('button', { name: /^add department$/i }).click();

    // Wait for dialog to close
    await expect(deptDialog).not.toBeVisible({ timeout: 5000 });

    await expect(authenticatedPage.getByText(frontendDept).first()).toBeVisible({
      timeout: 10000,
    });

    // 5. Staffing: Add Person to Engineering
    console.log('Step 4: Adding Person to Department');

    // Click on the Engineering department to select it
    await authenticatedPage.getByText(engineeringDept).first().click();

    // Wait a moment for the department to be selected
    await authenticatedPage.waitForTimeout(1000);

    // Click Add Person button
    await authenticatedPage
      .getByRole('button', { name: /add person/i })
      .first()
      .click();

    // Wait for person dialog to appear
    const personDialog = authenticatedPage.getByRole('dialog');
    await expect(personDialog).toBeVisible({ timeout: 5000 });

    // Fill in person details using exact label matches
    await personDialog.getByLabel(/^full name/i).fill(personName);
    await personDialog.getByLabel(/^email$/i).fill(personEmail);

    // Click Add Person button (not "Add Field" or other buttons)
    await personDialog.getByRole('button', { name: /^add person$/i }).click();

    // Wait for dialog to close
    await expect(personDialog).not.toBeVisible({ timeout: 5000 });

    // Verify person appears in the list
    await expect(authenticatedPage.getByText(personName).first()).toBeVisible({ timeout: 10000 });

    // 6. Move Person (Re-org)
    console.log('Step 5: Moving Person');

    // Click on the person name to open details/actions
    await authenticatedPage.getByText(personName).first().click();

    // Wait for any details panel or context to load
    await authenticatedPage.waitForTimeout(500);

    // Click Edit button
    await authenticatedPage
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click();

    // Wait for edit dialog to appear
    const editDialog = authenticatedPage.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 5000 });

    // Change department using the HierarchicalTreeSelector
    // The component has id="departmentId" and renders as a custom dropdown
    const deptSelector = editDialog.locator('#departmentId');
    await expect(deptSelector).toBeVisible({ timeout: 3000 });

    // Click to open the dropdown
    await deptSelector.click();

    // Wait for dropdown options to appear and click the Frontend department
    // Options appear in a div with role="button"
    await editDialog.getByRole('button', { name: frontendDept }).first().click({ timeout: 5000 });

    // Click Update Person button
    await editDialog.getByRole('button', { name: /^update person$/i }).click();

    // Wait for dialog to close
    await expect(editDialog).not.toBeVisible({ timeout: 5000 });

    // 7. Verify Person still visible after move
    await expect(authenticatedPage.getByText(personName).first()).toBeVisible({ timeout: 10000 });
    console.log('CUJ-1 Complete');
  });
});
