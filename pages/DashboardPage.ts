import { expect , Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/dashboard$/i);
  }

}
