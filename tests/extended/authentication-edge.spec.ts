import { test, expect } from '../../fixtures/mockApi';
import { LoginPage } from '../../pages/LoginPage';
import {
  env,
  hasTestAccount,
  STRONG_PASSWORD,
  uniqueEmail,
} from '../../utils/testData';

test.describe('Authentication edge cases', () => {
  test('login form remains on sign-in when submitted empty', async ({ page }) => {
    const auth = new LoginPage(page);
    await auth.gotoLogin();
    await auth.loginButton.click();
    await expect(page).toHaveURL(/sign-in|login/i);
  });

  test('rejects an unknown account', async ({ page }) => {
    const auth = new LoginPage(page);
    await auth.login(`unknown-${Date.now()}@example.invalid`, STRONG_PASSWORD);
    await auth.expectLoginError();
  });

  test('rejects an invalid email format', async ({ page }) => {
    const auth = new LoginPage(page);
    await auth.gotoLogin();
    await auth.emailInput.fill('not-an-email');
    await auth.passwordInput.fill(STRONG_PASSWORD);
    await auth.loginButton.click();
    await expect(page).toHaveURL(/sign-in|login/i);
  });

  test('rejects a wrong password for the configured test account', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env to run this case.');
    const auth = new LoginPage(page);
    await auth.login(env.testEmail, 'WrongPassword999!');
    await auth.expectLoginError();
  });

  test('registration rejects a weak password', async ({ page }) => {
    const auth = new LoginPage(page);
    await auth.register('Weak Password User', uniqueEmail(), '123');
    await expect(auth.errorMessage).toBeVisible();
  });

  test('sign-in fields remain available after refresh', async ({ page }) => {
    const auth = new LoginPage(page);
    await auth.gotoLogin();
    await page.reload();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.passwordInput).toBeVisible();
  });
});
