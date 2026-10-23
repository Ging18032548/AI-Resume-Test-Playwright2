import { Locator, Page, TestInfo } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  readonly hamburgerMenuButton: Locator;
  readonly userMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.hamburgerMenuButton = page.locator(
      '[data-testid="hamburger-menu"], ' +
      'button[aria-label*="menu" i], ' +
      'button[aria-label*="navigation" i]'
    ).first();

    this.userMenuButton = page.locator(
      '[data-testid="user-menu"], ' +
      'button[aria-label*="user" i], ' +
      'button[aria-label*="account" i], ' +
      '[class*="user-menu"]'
    ).first();
  }

  async isMobileViewport(): Promise<boolean> {
    const viewport = this.page.viewportSize();

    if (!viewport) {
      return false;
    }

    return viewport.width < 768;
  }

  async openMobileMenuIfPresent(): Promise<boolean> {
    if (
      await this.hamburgerMenuButton.count() > 0 &&
      await this.hamburgerMenuButton.isVisible()
    ) {
      await this.hamburgerMenuButton.click();
      return true;
    }

    return false;
  }

  async openUserMenuIfPresent(): Promise<boolean> {
    if (
      await this.userMenuButton.count() > 0 &&
      await this.userMenuButton.isVisible()
    ) {
      await this.userMenuButton.click();
      return true;
    }

    return false;
  }

  async attachScreenshot(
    testInfo: TestInfo,
    label: string,
    locator?: Locator
  ) {
    const screenshot = locator
      ? await locator.screenshot()
      : await this.page.screenshot();

    await testInfo.attach(label, {
      body: screenshot,
      contentType: 'image/png',
    });
  }
}