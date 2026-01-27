import { test, expect, Page } from '@playwright/test';

// Helper to create a new user and return their page and details
async function createUser(browser: any, prefix: string) {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', // Explicitly set IPv4 base URL
  });
  const page = await context.newPage();
  const user = {
    name: `${prefix} User`,
    email: `${prefix.toLowerCase()}-${Date.now()}@example.com`,
    password: 'SecureTestPassword123!',
  };

  await page.goto('/signup');
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm Password').fill(user.password);
  await page.getByRole('button', { name: /sign up|create account/i }).click();
  await page.waitForURL(
    (url: URL) =>
      url.pathname === '/' ||
      url.pathname.includes('organizations') ||
      url.pathname.includes('dashboard') ||
      url.pathname.includes('/org/'),
    { timeout: 10000 }
  );

  return { context, page, user };
}

// Helper to setup an organization with a department and a member
async function setupOrgAndMember(browser: any, ownerPrefix: string, memberPrefix: string) {
  const owner = await createUser(browser, ownerPrefix);
  const member = await createUser(browser, memberPrefix);

  const orgName = `Org ${Date.now()}`;
  await owner.page
    .getByRole('button', { name: /create|new|add/i })
    .first()
    .click();
  await owner.page.getByLabel(/name/i).fill(orgName);
  await owner.page.getByRole('button', { name: 'Create Organization', exact: true }).click();
  await owner.page.waitForURL(/\/org\/[a-zA-Z0-9-]+/);
  const orgId = owner.page.url().split('/org/')[1].split('/')[0];

  // setup department
  await owner.page.getByRole('link', { name: 'Departments', exact: true }).click();
  await owner.page.waitForURL(/\/org\/[a-zA-Z0-9-]+\/departments/);
  await owner.page.getByRole('button', { name: 'Add Department' }).first().click();
  await owner.page.getByLabel(/department name/i).fill('General');
  const deptSubmitBtn = owner.page.locator('form button[type="submit"]').filter({ visible: true });
  await expect(deptSubmitBtn).toBeEnabled();
  await deptSubmitBtn.click();
  await expect(owner.page.locator('form').filter({ visible: true })).toHaveCount(0);
  await expect(owner.page.getByText('General', { exact: true }).first()).toBeVisible();

  // setup member
  await owner.page.getByRole('link', { name: 'People', exact: true }).click();
  await owner.page.waitForURL(/\/org\/[a-zA-Z0-9-]+\/people/);
  await owner.page.getByRole('button', { name: 'Add Person' }).first().click();
  await owner.page.getByLabel(/email/i).fill(member.user.email);
  await owner.page.getByLabel(/name/i).fill(member.user.name);
  // Select Department
  console.log('Selecting Department...');
  const deptSelector = owner.page.locator('#departmentId');
  const selectorText = await deptSelector.innerText();
  if (!selectorText.includes('General')) {
    await deptSelector.click();
    await expect(owner.page.getByPlaceholder('Search departments...')).toBeVisible();
    await owner.page
      .getByText('General', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
  }

  console.log('Submitting Person form...');
  const submitBtn = owner.page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add Person', exact: true });
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  await expect(owner.page.getByText(member.user.email)).toBeVisible();

  // 3. ADD AS ORG MEMBER (so they show up in ownership transfer)
  // Navigate back to Dashboard to access the Share button
  await owner.page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await owner.page.getByRole('button', { name: /share/i }).first().click();
  await expect(owner.page.getByRole('dialog')).toBeVisible();
  await owner.page.getByRole('tab', { name: /team members|members/i }).click();
  await owner.page.getByRole('button', { name: /add member/i }).click();
  await owner.page.getByPlaceholder(/search by name or email/i).fill(member.user.email);
  await owner.page.getByText(member.user.name).filter({ visible: true }).first().click();

  // Select role as admin
  await owner.page.locator('select').selectOption('admin');
  await owner.page.locator('form').getByRole('button', { name: 'Add Member', exact: true }).click();
  await owner.page.getByRole('button', { name: /close/i }).click();

  return { owner, member, orgId };
}

test.describe('Ownership Transfer', () => {
  // Run serially to avoid conflicts
  test.describe.configure({ mode: 'serial' });

  // Force IPv4 to avoid localhost resolution issues
  test.use({ baseURL: 'http://127.0.0.1:5173' });

  test('Complete flow: initiate -> accept -> complete', async ({ browser }) => {
    const { owner, member, orgId } = await setupOrgAndMember(browser, 'Owner', 'Member');

    // 4. Owner Initiates Transfer
    await owner.page.getByRole('link', { name: 'Settings', exact: true }).click();
    await owner.page.getByRole('button', { name: /transfer ownership/i }).click();

    await expect(owner.page.getByRole('dialog')).toBeVisible();

    // Select New Owner
    // Option 0 is "Select a member...", Option 1 should be our member
    await owner.page.locator('select').first().selectOption({ index: 1 });

    await owner.page.getByPlaceholder(/explain why/i).fill('Happy Path Transfer');
    await owner.page.getByPlaceholder('TRANSFER', { exact: true }).fill('TRANSFER');
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Transfer Ownership' }).click();

    await expect(owner.page.getByText(/ownership transfer pending/i)).toBeVisible();

    // 5. Member Accepts
    await member.page.goto(`/org/${orgId}/dashboard`);
    await member.page.reload(); // Ensure fresh data
    await expect(member.page.getByText(/action required: ownership transfer/i)).toBeVisible();
    await member.page.getByRole('button', { name: /accept/i }).click();

    // Verify success
    await expect(member.page.getByText(/ownership transfer accepted/i)).toBeVisible();

    // Additional check: Member is now Owner
    await member.page.getByRole('link', { name: /settings/i }).click();
    await expect(member.page.getByRole('button', { name: /transfer ownership/i })).toBeVisible();
  });

  test('Complete flow: initiate -> reject', async ({ browser }) => {
    const { owner, member, orgId } = await setupOrgAndMember(
      browser,
      'OwnerReject',
      'MemberReject'
    );

    // Initiate
    await owner.page.goto(`/org/${orgId}/settings`);
    await owner.page.getByRole('button', { name: /transfer ownership/i }).click();
    await owner.page.locator('select').first().selectOption({ index: 1 });
    await owner.page.getByPlaceholder(/explain why/i).fill('To be rejected');
    await owner.page.getByPlaceholder('TRANSFER', { exact: true }).fill('TRANSFER');
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Transfer Ownership' }).click();

    // Member Rejects
    await member.page.goto(`/org/${orgId}/dashboard`);
    await expect(member.page.getByText(/action required/i)).toBeVisible();

    // Click Reject
    // Logic might show a modal or direct
    // Expect Reject button in banner
    await member.page.getByRole('button', { name: /reject/i }).click();

    // If modal:
    await member.page.getByPlaceholder(/reason/i).fill('Not interested');
    await member.page.getByRole('button', { name: 'Reject Transfer' }).click();

    // Verify success
    await expect(member.page.getByText(/transfer rejected/i)).toBeVisible();
    await expect(member.page.getByText(/action required/i)).not.toBeVisible();

    // Owner checks history
    await owner.page.reload();
    await owner.page.getByRole('link', { name: /settings/i }).click();
    // Should still have button (still owner)
    await expect(owner.page.getByRole('button', { name: /transfer ownership/i })).toBeVisible();

    // Check History Status
    await expect(owner.page.getByText('Rejected').first()).toBeVisible();
  });

  test('Complete flow: initiate -> cancel', async ({ browser }) => {
    const { owner, member, orgId } = await setupOrgAndMember(
      browser,
      'OwnerCancel',
      'MemberCancel'
    );

    await owner.page.goto(`/org/${orgId}/settings`);
    await owner.page.getByRole('button', { name: /transfer ownership/i }).click();
    await owner.page.locator('select').first().selectOption({ index: 1 });
    await owner.page.getByPlaceholder(/explain why/i).fill('To be cancelled');
    await owner.page.getByPlaceholder('TRANSFER', { exact: true }).fill('TRANSFER');
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Transfer Ownership' }).click();

    // Verify Pending Banner
    await expect(owner.page.getByText(/ownership transfer pending/i)).toBeVisible();

    // Cancel
    await owner.page.getByRole('button', { name: /cancel/i }).click();
    // If modal:
    await owner.page.getByPlaceholder(/reason/i).fill('Changed mind');
    await owner.page.getByRole('button', { name: 'Cancel Transfer' }).click();

    // Example verification
    await expect(owner.page.getByText(/ownership transfer cancelled/i)).toBeVisible();
    await expect(owner.page.getByText(/ownership transfer pending/i)).not.toBeVisible();

    // History check
    await expect(owner.page.getByText('Cancelled').first()).toBeVisible();
  });

  test('View audit trail', async ({ browser }) => {
    // Re-use logic or check logs.
    // Actually, just checking that "View Log" button works in history list is enough for E2E.
    // We can chain this in the Cancel or Reject test, but separate is cleaner if we had persistent data.
    // Since we create fresh data, we'll do a quick transfer -> cancel -> check log.

    const { owner, member, orgId } = await setupOrgAndMember(browser, 'OwnerAudit', 'MemberAudit');

    // Init & Cancel
    await owner.page.goto(`/org/${orgId}/settings`);
    await owner.page.getByRole('button', { name: /transfer ownership/i }).click();
    await owner.page.locator('select').first().selectOption({ index: 1 });
    await owner.page.getByPlaceholder(/explain why/i).fill('Audit Test');
    await owner.page.getByPlaceholder('TRANSFER', { exact: true }).fill('TRANSFER');
    await owner.page.getByRole('dialog').getByRole('button', { name: 'Transfer Ownership' }).click();
    await owner.page.getByRole('button', { name: /cancel/i }).click();
    await owner.page.getByPlaceholder(/reason/i).fill('Audit Check');
    await owner.page.getByRole('button', { name: 'Cancel Transfer' }).click();

    // Check Audit Log
    // In History List, there should be a "View Log" or details button?
    // Based on implementation plan, maybe just expanding the row?
    // Let's assume clicking the row or a specific button.
    // Use generic Text matcher for now.
    await expect(owner.page.getByText('Cancelled').first()).toBeVisible();

    // If there is an Audit Log modal:
    // This part depends on UI implementation of Audit Log viewing.
    // If not implemented in UI yet (only backend), we skip.
    // But Phase 2 said "View Audit Log" is a feature.
    // Let's assume there is a button "View Log" in the history item.
    await owner.page
      .getByRole('button', { name: /history|log|details/i })
      .first()
      .click();

    // Verify log content
    await expect(owner.page.getByText('Transfer cancelled')).toBeVisible();
    await expect(owner.page.getByText('Audit Check')).toBeVisible();
  });
});
