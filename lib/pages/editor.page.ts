// ---------------------------------------------------------------------------
// EditorPage — page object for /editor (new article) and /editor/:slug (edit)
// ---------------------------------------------------------------------------

import { Page, expect } from '@playwright/test';

export class EditorPage {
  constructor(private page: Page) {}

  // -- Navigation -----------------------------------------------------------

  async gotoNew() {
    await this.page.goto('/editor');
    await expect(this.page.locator('input[placeholder="Article Title"]')).toBeVisible();
  }

  async gotoEdit(slug: string) {
    await this.page.goto(`/editor/${slug}`);
    await expect(this.page.locator('input[placeholder="Article Title"]')).toBeVisible();
  }

  // -- Actions --------------------------------------------------------------

  async fillTitle(title: string) {
    await this.page.locator('input[placeholder="Article Title"]').fill(title);
  }

  async fillDescription(description: string) {
    await this.page.locator('input[placeholder="What\'s this article about?"]').fill(description);
  }

  async fillBody(body: string) {
    await this.page.locator('textarea[placeholder="Write your article (in markdown)"]').fill(body);
  }

  async addTag(tag: string) {
    const input = this.page.locator('input[placeholder="Enter tags"]');
    await input.fill(tag);
    await input.press('Enter');
  }

  async publish() {
    await this.page.getByRole('button', { name: /publish/i }).click();
    // After publishing, the app navigates to the article page
    await expect(this.page).toHaveURL(/\/article\//, { timeout: 8000 });
  }

  /**
   * Fill all fields and publish in one call.
   */
  async createArticle(title: string, description: string, body: string, tags?: string[]) {
    await this.fillTitle(title);
    await this.fillDescription(description);
    await this.fillBody(body);
    if (tags) {
      for (const tag of tags) {
        await this.addTag(tag);
      }
    }
    await this.publish();
  }

  // -- Assertions -----------------------------------------------------------

  async expectTitleValue(title: string) {
    await expect(this.page.locator('input[placeholder="Article Title"]')).toHaveValue(title);
  }
}
