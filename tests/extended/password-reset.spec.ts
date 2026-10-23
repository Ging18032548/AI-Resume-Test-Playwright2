import { test, expect } from '../../fixtures/mockApi';
import { LoginPage } from '../../pages/LoginPage';
import { env, hasTestAccount } from '../../utils/testData';

test.describe('Password reset flow', () => {
  test('rejects an invalid reset email without leaving the reset page', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    await login.resetEmailInput.fill('not-an-email');
    await login.resetSubmitButton.click();

    await expect(page).toHaveURL(/\/forgot-password$/i);
    await expect(login.resetConfirmation).not.toBeVisible();
  });

  test('accepts a known account reset request', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env.');
    const login = new LoginPage(page);
    await login.requestPasswordReset(env.testEmail);

    await expect(page).toHaveURL(/\/forgot-password$/i);
    await login.expectPasswordResetRequested();
  });
});
