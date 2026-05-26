// ---------------------------------------------------------------------------
// LoginPage — page object for /login
// ---------------------------------------------------------------------------

import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // -- Navigation -----------------------------------------------------------

  async goto() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  }

  // -- Actions --------------------------------------------------------------

  async fillEmail(email: string) {
    await this.page.getByPlaceholder('Email').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByPlaceholder('Password').fill(password);
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  /**
   * Full login flow. Waits for the nav to reflect the logged-in state.
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    // nav.navbar is the top-level navigation; wait until it no longer shows Sign in
    await expect(this.page.locator('nav.navbar')).not.toContainText('Sign in', { timeout: 8000 });
  }

  // -- Assertions -----------------------------------------------------------

  async expectError(text: string) {
    await expect(this.page.locator('.error-messages')).toContainText(text);
  }
}
