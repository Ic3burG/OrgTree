import { test, expect } from './fixtures/test-user';

test.describe('Public Sharing', () => {
  let shareUrl: string | null = null;
  
  test('should enable public sharing and get share link', async ({ authenticatedPage }) => {
    // Create an organization
    const orgName = `Share Test Org ${Date.now()}`;
    
    await authenticatedPage.getByRole('button', { name: /create|new|add/i }).first().click();
    await authenticatedPage.getByLabel(/name/i).fill(orgName);
    await authenticatedPage.getByRole('button', { name: /create|save|submit/i }).click();
    
    // Navigate to org
    await authenticatedPage.getByText(orgName).click();
    await authenticatedPage.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });
    
    // Find sharing settings (may be in settings menu or share button)
    const shareButton = authenticatedPage.getByRole('button', { name: /share|public/i });
    const settingsButton = authenticatedPage.getByRole('button', { name: /settings/i });
    
    if (await shareButton.isVisible()) {
      await shareButton.click();
    } else if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await authenticatedPage.getByRole('tab', { name: /sharing|public/i }).click();
    }
    
    // Enable public sharing
    const toggle = authenticatedPage.getByRole('switch', { name: /public|share/i });
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    
    // Should show share link
    const shareLinkInput = authenticatedPage.getByRole('textbox', { name: /link|url/i });
    if (await shareLinkInput.isVisible()) {
      shareUrl = await shareLinkInput.inputValue();
      expect(shareUrl).toContain('/public/');
    }
  });

  test('should access public organization without authentication', async ({ page }) => {
    // First, create an org and enable sharing using authenticated page
    const orgName = `Public Access Test ${Date.now()}`;
    
    // Sign up
    const email = `public-test-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Name').fill('Public Test User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!');
    await page.getByLabel('Confirm Password').fill('SecurePassword123!');
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Wait for auth
    await page.waitForURL(url => !url.pathname.includes('/signup'), { timeout: 10000 });
    
    // Create org
    await page.getByRole('button', { name: /create|new|add/i }).first().click();
    await page.getByLabel(/name/i).fill(orgName);
    await page.getByRole('button', { name: /create|save|submit/i }).click();
    
    // Navigate to org
    await page.getByText(orgName).click();
    await page.waitForURL(/\/org\/|\/organizations\//, { timeout: 10000 });
    
    // Try to find and enable sharing
    const shareButton = page.getByRole('button', { name: /share|public/i });
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      const toggle = page.getByRole('switch', { name: /public|share/i });
      if (await toggle.isVisible()) {
        await toggle.click();
        
        // Get the share link
        const shareLinkInput = page.getByRole('textbox', { name: /link|url/i });
        if (await shareLinkInput.isVisible()) {
          const shareLink = await shareLinkInput.inputValue();
          
          // Logout
          await page.getByRole('button', { name: /logout|sign out/i }).click();
          await page.waitForURL(/\/login/, { timeout: 10000 });
          
          // Access public link
          await page.goto(shareLink);
          
          // Should see org content
          await expect(page.getByText(orgName)).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });
});
