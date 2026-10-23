import { test, expect } from '../../fixtures/mockApi';
import { LoginPage } from '../../pages/LoginPage';
import { env, hasTestAccount } from '../../utils/testData';

const protectedPages = [
  { path: '/dashboard', marker: /hello|resume|analysis|แดชบอร์ด/i },
  { path: '/resumes/upload', marker: /resume|upload|อัปโหลด/i },
  { path: '/history', marker: /history|ประวัติ/i },
  { path: '/jobs', marker: /job|งาน/i },
  { path: '/insights', marker: /insight|วิเคราะห์|สรุป/i },
  { path: '/settings', marker: /setting|profile|โปรไฟล์|ตั้งค่า/i },
] as const;

test.describe('Protected pages functional coverage', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env.');
    await new LoginPage(page).login(env.testEmail, env.testPassword);
  });

  for (const protectedPage of protectedPages) {
    test(`${protectedPage.path} renders page content and no error state`, async ({ page }) => {
      await page.goto(protectedPage.path, { waitUntil: 'networkidle' });

      await expect(page).toHaveURL(new RegExp(`${protectedPage.path.replace('/', '\\/')}$`, 'i'));
      const main = page.locator('main');
      await expect(main).toBeVisible();
      await expect(main).not.toContainText(/something went wrong|internal server error|เกิดข้อผิดพลาด/i);
      await expect(main.getByText(protectedPage.marker).first()).toBeVisible();
    });
  }

  test('protected pages remain inaccessible after logout and browser back', async ({ page }) => {
    const login = new LoginPage(page);
    await page.goto('/settings');
    await login.logout();
    await page.goBack();

    await expect(page).toHaveURL(/\/(sign-in|login)(?:$|\/)/i);
    await page.goto('/history');
    await expect(page).toHaveURL(/\/(sign-in|login)(?:$|\/)/i);
  });
});
