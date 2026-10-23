import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AnalysisResultPage extends BasePage {
  readonly pageContent: Locator;
  readonly scoreGauge: Locator;
  readonly recommendations: Locator;
  readonly pendingState: Locator;
  readonly failedState: Locator;

  constructor(page: Page) {
    super(page);
    this.pageContent = page.locator('.analysis-page');
    this.scoreGauge = page.locator('.score-ring-gauge');
    this.recommendations = page.locator('.recommendations-card');
    this.pendingState = page.locator('.analysis-progress, .analysis-state').filter({
      hasText: /pending|queued|processing|กำลัง/i,
    }).first();
    this.failedState = page.locator('.analysis-state--error');
  }

  async expectUrl() {
    await expect(this.page).toHaveURL(/\/analyses\/\d+$/);
  }

  async waitForCompletion(timeout = 120_000) {
    await expect(this.pageContent).toBeVisible({ timeout });
    await expect(this.scoreGauge).toBeVisible({ timeout });
  }

  async expectScoreInValidRange() {
    await this.waitForCompletion();
    const label = await this.scoreGauge.getAttribute('aria-label');
    const score = Number.parseFloat(label?.match(/(\d+(?:\.\d+)?)/)?.[1] ?? '');
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }
}
