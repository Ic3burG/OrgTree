import { test, expect } from '@playwright/test';

// Run tests serially to avoid rate limiting
test.describe.configure({ mode: 'serial' });

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/login');

      // Login page has "Welcome back" heading
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      // Use exact match to avoid matching "Sign in with Passkey"
      await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword123');
      // Use exact match
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();

      // Should show error message
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('link', { name: /sign up|create account|register/i }).click();

      await expect(page).toHaveURL(/\/signup/);
    });
  });

  test.describe('Signup', () => {
    test('should display signup page', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('short');
      await page.getByLabel('Confirm Password').fill('short');
      await page.getByRole('button', { name: /sign up|create|register/i }).click();

      // Should show password requirement error (6 characters minimum)
      await expect(page.getByText(/at least 6 characters/i)).toBeVisible({ timeout: 5000 });
    });

    test('should create account and redirect', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      await page.goto('/signup');

      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!');
      await page.getByLabel('Confirm Password').fill('SecurePassword123!');
      await page.getByRole('button', { name: /sign up|create|register/i }).click();

      // Should redirect away from signup page
      await page.waitForURL(url => !url.pathname.includes('/signup'), { timeout: 10000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login', async ({ page }) => {
      // First signup to get authenticated
      const uniqueEmail = `logout-test-${Date.now()}@example.com`;

      await page.goto('/signup');
      await page.getByLabel('Name').fill('Logout Test');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!');
      await page.getByLabel('Confirm Password').fill('SecurePassword123!');
      await page.getByRole('button', { name: /sign up|create|register/i }).click();

      // Wait for authenticated state - will go to organizations page or dashboard
      await page.waitForURL(url => !url.pathname.includes('/signup'), { timeout: 10000 });

      // Give the page time to fully load
      await page.waitForTimeout(1000);

      // Click the Logout button directly
      await page.getByRole('button', { name: 'Logout' }).click();

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 15000 });
    });
  });
});
