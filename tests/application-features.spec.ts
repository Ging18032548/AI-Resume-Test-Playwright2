import { test, expect } from '../fixtures/mockApi';
import { LoginPage } from '../pages/LoginPage';
import {
  env,
  hasRegistrationAccount,
  uniqueRegistrationEmail,
} from '../utils/testData';

const protectedRoutes = [
  '/dashboard',
  '/resumes/upload',
  '/history',
  '/jobs',
  '/insights',
  '/settings',
] as const;

test.describe('AI CV Analyzer application features', () => {
  test('new member can use authentication, protected pages, navigation, and logout', async ({ page }) => {
    test.skip(
      !hasRegistrationAccount(),
      'Set REGISTRATION_NAME, REGISTRATION_EMAIL, and REGISTRATION_PASSWORD in .env.',
    );

    const login = new LoginPage(page);
    const email = uniqueRegistrationEmail();

    await login.registerFromSignIn(
      env.registrationName,
      email,
      env.registrationPassword,
    );
    await expect(page).toHaveURL(/\/sign-in$/i);

    await login.login(email, env.registrationPassword);
    await login.expectLoggedIn();

    for (const route of protectedRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`));
      await expect(page.locator('main')).toBeVisible();
    }

    await page.goto('/settings');
    await page.goto('/history');
    await page.goBack();
    await expect(page).toHaveURL(/\/settings$/i);
    await page.goForward();
    await expect(page).toHaveURL(/\/history$/i);

    await login.logout();
    await login.expectLoggedOut();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in$/i);
  });

  test('sign-in validates invalid credentials and forgot-password is reachable', async ({ page }) => {
    const login = new LoginPage(page);

    await login.login(`unknown-${Date.now()}@example.invalid`, 'WrongPassword123!');
    await login.expectLoginError();

    await page.goto('/forgot-password');
    await expect(login.resetEmailInput).toBeVisible();
    await expect(login.resetSubmitButton).toBeVisible();
  });
});
