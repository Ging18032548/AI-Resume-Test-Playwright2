import { test, expect, Page } from '../../fixtures/mockApi';
import { LoginPage } from '../../pages/LoginPage';
import { UploadResumePage } from '../../pages/UploadResumePage';
import { AnalysisResultPage } from '../../pages/AnalysisResultPage';
import { env, hasTestAccount } from '../../utils/testData';
import { createValidCvPdf } from '../../utils/testFiles';

test.describe('AI resume analysis', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env.');
    await new LoginPage(page).login(env.testEmail, env.testPassword);
  });

  async function startAnalysis(page: Page) {
    const upload = new UploadResumePage(page);
    await upload.goto();
    await upload.uploadResume(createValidCvPdf(`analysis-${Date.now()}.pdf`));
    await upload.upload();
    await upload.startAnalysis();
  }

  test('completes analysis and exposes a score from 0 to 100', async ({ page }) => {
    await startAnalysis(page);
    const result = new AnalysisResultPage(page);
    await result.expectUrl();
    await result.expectScoreInValidRange();
  });

  test('persists the completed result after reload', async ({ page }) => {
    await startAnalysis(page);
    const result = new AnalysisResultPage(page);
    await result.expectScoreInValidRange();
    const url = page.url();
    await page.reload();
    await expect(page).toHaveURL(url);
    await result.waitForCompletion();
  });
});
