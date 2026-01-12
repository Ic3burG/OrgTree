import { test as base, expect, Page } from '@playwright/test';

// Test user credentials
const TEST_USER = {
  name: 'E2E Test User',
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'SecureTestPassword123!',
};

// Fixture that provides an authenticated page
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: typeof TEST_USER;
}>({
  testUser: async ({}, use) => {
    await use(TEST_USER);
  },
  
  authenticatedPage: async ({ page }, use) => {
    // First, create a test user
    await page.goto('/signup');
    await page.getByLabel('Name').fill(TEST_USER.name);
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password);
    await page.getByLabel('Confirm Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    
    // Wait for redirect to dashboard or home
    await page.waitForURL(/\/(organizations|dashboard)?$/);
    
    // Now the page is authenticated
    await use(page);
    
    // Cleanup: logout (optional, tests should be isolated)
    // No explicit cleanup needed as each test gets fresh context
  },
});

export { expect };
