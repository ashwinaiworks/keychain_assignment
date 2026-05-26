// ---------------------------------------------------------------------------
// HomePage — page object for / (the global feed)
// ---------------------------------------------------------------------------
// Note: .banner is only rendered for unauthenticated users in this Conduit
// build. Use navbar() for a reliable visible element on all states.
// ---------------------------------------------------------------------------

import { Page, expect } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  // -- Navigation -----------------------------------------------------------

  async goto() {
    await this.page.goto('/');
    // Wait for the main nav — present for both guests and logged-in users
    await expect(this.navbar()).toBeVisible();
  }

  // -- Locators -------------------------------------------------------------

  navbar() {
    // nav.navbar is the primary nav; a secondary <nav> exists for pagination
    return this.page.locator('nav.navbar');
  }

  articleLinks() {
    return this.page.locator('.preview-link');
  }

  navLink(name: string) {
    return this.navbar().getByRole('link', { name });
  }

  globalFeedTab() {
    return this.page.getByRole('link', { name: 'Global Feed' });
  }

  // -- Actions --------------------------------------------------------------

  async clickGlobalFeed() {
    await this.globalFeedTab().click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToNewArticle() {
    // This Conduit build uses "New Post" not "New Article"
    await this.navLink('New Post').click();
    await expect(this.page).toHaveURL(/\/editor/);
  }

  async logout() {
    await this.navLink('Settings').click();
    await this.page.getByRole('button', { name: /logout/i }).click();
    await expect(this.navbar()).toContainText('Sign in', { timeout: 8000 });
  }

  // -- Assertions -----------------------------------------------------------

  async expectLoggedIn(username: string) {
    await expect(this.navbar()).toContainText(username);
  }

  async expectLoggedOut() {
    await expect(this.navbar()).toContainText('Sign in');
  }
}
