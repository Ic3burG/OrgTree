import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel('Email').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword123');
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      
      // Should show error message
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
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
      
      await expect(page.getByRole('heading', { name: /sign up|create|register/i })).toBeVisible();
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/signup');
      
      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('short');
      await page.getByRole('button', { name: /sign up|create|register/i }).click();
      
      // Should show password requirement error
      await expect(page.getByText(/password|characters/i)).toBeVisible();
    });

    test('should create account and redirect', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      await page.goto('/signup');
      
      await page.getByLabel('Name').fill('Test User');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password').fill('SecurePassword123!');
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
      await page.getByLabel('Password').fill('SecurePassword123!');
      await page.getByRole('button', { name: /sign up|create|register/i }).click();
      
      // Wait for authenticated state
      await page.waitForURL(url => !url.pathname.includes('/signup'), { timeout: 10000 });
      
      // Find and click logout (may be in dropdown or visible)
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      const logoutLink = page.getByRole('link', { name: /logout|sign out/i });
      
      // Try button first, then link
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else if (await logoutLink.isVisible()) {
        await logoutLink.click();
      } else {
        // May be in a user menu
        const userMenu = page.getByRole('button', { name: /user|account|menu/i }).first();
        if (await userMenu.isVisible()) {
          await userMenu.click();
          await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
        }
      }
      
      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });
  });
});
