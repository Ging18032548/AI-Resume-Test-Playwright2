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

test('new member can access every protected application page', async ({ page }) => {
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

  for (const path of protectedRoutes) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`));
    await expect(page.locator('main')).toBeVisible();
  }
});
