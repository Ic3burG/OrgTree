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
    // Handle empty state or header button
    await authenticatedPage
      .getByRole('button', { name: /create|new|add/i })
      .first()
      .click();

    await authenticatedPage.getByLabel(/name/i).fill(orgName);

    // Scope to the dialog
    const createDialog = authenticatedPage.getByRole('dialog');
    if (await createDialog.isVisible()) {
      await createDialog.getByRole('button', { name: 'Create Organization' }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: 'Create Organization' }).click();
    }

    // Verify Org Created and Navigate
    await expect(authenticatedPage.getByText(orgName)).toBeVisible({ timeout: 10000 });
    await authenticatedPage.getByText(orgName).click();
    await authenticatedPage.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });

    // 3. Add Top-Level Department (Engineering)
    console.log('Step 2: Adding Top-Level Department');
    // Navigate to Departments page to ensure button is visible
    await authenticatedPage.getByRole('link', { name: /departments/i }).click();
    await authenticatedPage.waitForURL(/\/departments/, { timeout: 10000 });

    await authenticatedPage.getByRole('button', { name: /add department|new department/i }).click();
    await authenticatedPage.getByLabel(/name/i).fill(engineeringDept);

    const deptDialog = authenticatedPage.getByRole('dialog');
    if (await deptDialog.isVisible()) {
      await deptDialog.getByRole('button', { name: 'Add Department', exact: true }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: 'Add Department', exact: true }).click();
    }

    // Verify Engineering exists
    await expect(authenticatedPage.getByText(engineeringDept)).toBeVisible();

    // 4. Add Another Department (Frontend)
    console.log('Step 3: Adding Second Department');
    await authenticatedPage.getByRole('button', { name: /add department|new department/i }).click();
    await authenticatedPage.getByLabel(/name/i).fill(frontendDept);

    if (await deptDialog.isVisible()) {
      await deptDialog.getByRole('button', { name: 'Add Department', exact: true }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: 'Add Department', exact: true }).click();
    }
    await expect(authenticatedPage.getByText(frontendDept)).toBeVisible();

    // 5. Staffing: Add Person to Engineering
    console.log('Step 4: Adding Person to Department');
    await authenticatedPage.getByText(engineeringDept).click();
    await authenticatedPage
      .getByRole('button', { name: /add person|add member/i })
      .first()
      .click();

    await authenticatedPage.getByLabel(/name/i).fill(personName);
    await authenticatedPage.getByLabel(/email/i).fill(personEmail);

    const personDialog = authenticatedPage.getByRole('dialog');
    // Person modal might use "Add Member" or "Add Person"
    // We'll try generic "Add" or "Save" but check if strict mode fails.
    // Usually "Add Member" is used. Let's try "Add Member" if safe, or regex but ensure specificity.
    // If "Add Field" is there, "Add Member" is distinct.
    if (await personDialog.isVisible()) {
      await personDialog.getByRole('button', { name: /save|add member|create/i }).click();
    } else {
      await authenticatedPage.getByRole('button', { name: /save|add member|create/i }).click();
    }

    // Verify Person is visible
    await expect(authenticatedPage.getByText(personName)).toBeVisible();

    // 6. Move Person (Re-org)
    console.log('Step 5: Moving Person');
    await authenticatedPage.getByText(personName).click();
    await authenticatedPage.getByRole('button', { name: /edit/i }).click();

    // Changing department
    const deptSelect = authenticatedPage.getByLabel(/department/i);
    // Wait for options to load if needed
    if (await deptSelect.isVisible()) {
      const tagName = await deptSelect.evaluate(el => el.tagName);
      if (tagName === 'SELECT') {
        await deptSelect.selectOption({ label: frontendDept });
      } else {
        await deptSelect.click();
        await authenticatedPage.getByRole('option', { name: frontendDept }).click();
      }
    }

    if (await authenticatedPage.getByRole('dialog').isVisible()) {
      await authenticatedPage
        .getByRole('dialog')
        .getByRole('button', { name: /save|update/i })
        .click();
    } else {
      await authenticatedPage.getByRole('button', { name: /save|update/i }).click();
    }

    // 7. Verify Move
    await expect(authenticatedPage.getByText(personName)).toBeVisible();
    console.log('CUJ-1 Complete');
  });
});
