import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  readonly nameInput: Locator;
  readonly familyNameInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;

  readonly resetEmailInput: Locator;
  readonly resetSubmitButton: Locator;
  readonly resetConfirmation: Locator;

  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);

    // Login
    this.emailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.loginButton = page.locator('button[type="submit"]').first();

    this.errorMessage = page
      .locator(
        '[role="alert"], ' +
          '[data-testid="login-error"], ' +
          '.error-message, ' +
          '.form-error',
      )
      .first();

    // Register / Sign Up
    this.registerLink = page
      .getByRole('link', { name: /register|sign up|create account|สมัครสมาชิก/i })
      .first();

    this.forgotPasswordLink = page
      .getByRole('link', { name: /forgot password|reset password|ลืมรหัสผ่าน/i })
      .first();

    // Form order: first name, last name, email, password, confirmation.
    this.nameInput = page.locator('input[type="text"]').first();
    this.familyNameInput = page.locator('input[type="text"]').nth(1);
    this.confirmPasswordInput = page
      .locator('input[type="password"]')
      .nth(1);

    this.registerButton = page
      .locator('form button[type="submit"]')
      .first();

    // Password Reset
    this.resetEmailInput = page.locator('input[type="email"]').first();

    this.resetSubmitButton = page
      .getByRole('button', {
        name: /reset|send|submit|ส่งรหัส\s*OTP/i,
      })
      .first();

    this.resetConfirmation = page
      .locator(
        '[data-testid="reset-confirmation"], ' +
          '[role="status"], ' +
          '.success-message, ' +
          'main p:has-text("เราได้ส่งรหัส OTP ไปแล้ว")',
      )
      .first();

    // Logout
    this.logoutButton = page
      .getByRole('button', { name: /logout|sign out|ออกจากระบบ/i })
      .first();
  }

  // ✅ เพิ่ม Alias goto() เพื่อให้เรียกใช้ตรงกับไฟล์ spec ต่างๆ ได้โดยไม่เกิด TS2339
  async goto() {
    await this.gotoLogin();
  }

  async gotoLogin() {
    await this.page.goto('/sign-in', {
      waitUntil: 'domcontentloaded',
    });
  }

  async login(email: string, password: string) {
    await this.gotoLogin();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/\/dashboard(?:$|\/)/i);
  }

  async expectLoginError(pattern?: RegExp) {
    await expect(this.errorMessage).toBeVisible();

    if (pattern) {
      await expect(this.errorMessage).toHaveText(pattern);
    }
  }

  async gotoRegister() {
    await this.page.goto('/register', {
      waitUntil: 'domcontentloaded',
    });
  }

  async openRegistrationFromSignIn() {
    await this.gotoLogin();
    await expect(this.registerLink).toBeVisible();
    await this.registerLink.click();
    await expect(this.page).toHaveURL(/\/register$/i);
  }

  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword = password,
  ) {
    await this.gotoRegister();

    const [firstName, ...lastNameParts] = name.trim().split(/\s+/);

    await this.nameInput.fill(firstName);

    if (lastNameParts.length > 0 && await this.familyNameInput.isVisible()) {
      await this.familyNameInput.fill(lastNameParts.join(' '));
    }

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(confirmPassword);
    }

    await this.registerButton.click();
  }

  async registerFromSignIn(
    name: string,
    email: string,
    password: string,
    confirmPassword = password,
  ) {
    await this.openRegistrationFromSignIn();

    const [firstName, ...lastNameParts] = name.trim().split(/\s+/);

    await this.nameInput.fill(firstName);
    if (lastNameParts.length > 0 && await this.familyNameInput.isVisible()) {
      await this.familyNameInput.fill(lastNameParts.join(' '));
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(confirmPassword);
    }
    await this.registerButton.click();
  }

  async requestPasswordReset(email: string) {
    await this.page.goto('/forgot-password', {
      waitUntil: 'domcontentloaded',
    });

    await this.resetEmailInput.fill(email);
    await this.resetSubmitButton.click();
  }

  async expectPasswordResetRequested() {
    await expect(this.resetConfirmation).toBeVisible();
  }

  async logout() {
    await this.openMobileMenuIfPresent();
    await this.openUserMenuIfPresent();

    await expect(this.logoutButton).toBeVisible();
    await this.logoutButton.click();
  }

  async expectLoggedOut() {
    await expect(this.page).toHaveURL(/sign-in|login|auth/i);
  }
}