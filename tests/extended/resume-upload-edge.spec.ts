import { test, expect } from '../../fixtures/mockApi';
import { LoginPage } from '../../pages/LoginPage';
import { UploadResumePage } from '../../pages/UploadResumePage';
import { env, hasTestAccount, MAX_UPLOAD_MB } from '../../utils/testData';
import {
  createFakePdfExtension,
  createInvalidFileType,
  createOversizedCvPdf,
  createValidCvPdf,
} from '../../utils/testFiles';

test.describe('Resume upload', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env.');
    await new LoginPage(page).login(env.testEmail, env.testPassword);
  });

  test('shows the upload form without a selected file', async ({ page }) => {
    const upload = new UploadResumePage(page);
    await upload.goto();
    await expect(upload.fileInput).toBeAttached();
    await expect(upload.uploadButton).toBeDisabled();
  });

  test('uploads a valid PDF and starts analysis', async ({ page }) => {
    const upload = new UploadResumePage(page);
    await upload.goto();
    await upload.uploadResume(createValidCvPdf('valid.pdf'));
    await upload.upload();
    await expect(upload.analyzeButton).toBeVisible();
  });

  test('rejects non-PDF files', async ({ page }) => {
    const upload = new UploadResumePage(page);
    await upload.goto();
    await upload.uploadResume(createInvalidFileType());
    await upload.expectUploadError(/PDF|ไฟล์/i);
  });

  test('rejects a fake PDF', async ({ page }) => {
    const upload = new UploadResumePage(page);
    await upload.goto();
    await upload.uploadResume(createFakePdfExtension());
    await upload.uploadButton.click();
    await upload.expectUploadError(/PDF|ไฟล์|ไม่ถูกต้อง|invalid/i);
  });

  test(`rejects files over ${MAX_UPLOAD_MB} MB`, async ({ page }) => {
    const upload = new UploadResumePage(page);
    await upload.goto();
    await upload.uploadResume(createOversizedCvPdf(MAX_UPLOAD_MB + 1));
    await upload.uploadButton.click();
    await upload.expectUploadError(/ใหญ่|size|maximum|limit|MB/i);
  });
});
