import { test, expect } from '../fixtures/mockApi';
import { LoginPage } from '../pages/LoginPage';
import { UploadResumePage } from '../pages/UploadResumePage';
import { AnalysisResultPage } from '../pages/AnalysisResultPage';
import { ProfilePage } from '../pages/ProfilePage';
import { env, hasTestAccount } from '../utils/testData';
import { createValidCvPdf } from '../utils/testFiles';

test.describe('Critical user journey', () => {
  test.beforeEach(async () => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env to run the critical journey.');
  });

  test('user can analyze a resume and safely leave the account', async ({ page }) => {
    const login = new LoginPage(page);
    const upload = new UploadResumePage(page);
    const result = new AnalysisResultPage(page);
    const profile = new ProfilePage(page);

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    await upload.goto();
    await upload.uploadResume(createValidCvPdf('critical-journey.pdf'));
    await upload.upload();
    await upload.startAnalysis();
    await result.expectScoreInValidRange();
    await page.reload();
    await result.waitForCompletion();

    await profile.goto();
    await expect(page).toHaveURL(/\/settings$/);

    await login.logout();
    await login.expectLoggedOut();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in|login/i);
  });
});