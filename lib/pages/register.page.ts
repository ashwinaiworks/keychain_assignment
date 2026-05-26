// ---------------------------------------------------------------------------
// RegisterPage — page object for /register
// ---------------------------------------------------------------------------

import { Page, expect } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}

  // -- Navigation -----------------------------------------------------------

  async goto() {
    await this.page.goto('/register');
    await expect(this.page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  }

  // -- Actions --------------------------------------------------------------

  async fillUsername(username: string) {
    await this.page.getByPlaceholder('Username').fill(username);
  }

  async fillEmail(email: string) {
    await this.page.getByPlaceholder('Email').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByPlaceholder('Password').fill(password);
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Sign up' }).click();
  }

  /**
   * Full registration flow. Waits for the nav to reflect the logged-in state.
   */
  async register(username: string, email: string, password: string) {
    await this.fillUsername(username);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    await expect(this.page.locator('nav.navbar')).not.toContainText('Sign up', { timeout: 8000 });
  }

  // -- Assertions -----------------------------------------------------------

  async expectError(text: string) {
    await expect(this.page.locator('.error-messages')).toContainText(text);
  }
}
