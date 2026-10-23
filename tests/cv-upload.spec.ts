import { test, expect } from '../fixtures/mockApi';
import { LoginPage } from '../pages/LoginPage';
import { UploadResumePage } from '../pages/UploadResumePage';
import { AnalysisResultPage } from '../pages/AnalysisResultPage';
import {
  env,
  hasRegistrationAccount,
  uniqueRegistrationEmail,
} from '../utils/testData';
import { createValidCvPdf } from '../utils/testFiles';

test('new member can register from sign-in, log in, and upload a resume', async ({ page }) => {
  test.skip(
    !hasRegistrationAccount(),
    'Set REGISTRATION_NAME, REGISTRATION_EMAIL, and REGISTRATION_PASSWORD in .env.',
  );

  const login = new LoginPage(page);
  const upload = new UploadResumePage(page);
  const analysis = new AnalysisResultPage(page);
  const email = uniqueRegistrationEmail();

  await login.registerFromSignIn(
    env.registrationName,
    email,
    env.registrationPassword,
  );
  await expect(page).toHaveURL(/\/sign-in$/i);

  await login.login(email, env.registrationPassword);
  await login.expectLoggedIn();

  await upload.goto();
  await expect(upload.fileInput).toBeAttached();
  await upload.uploadResume(createValidCvPdf('new-member-resume.pdf'));
  await upload.expectFileSelected('new-member-resume.pdf');
  await upload.upload();
  await upload.startAnalysis();
  await analysis.expectUrl();
  await analysis.expectScoreInValidRange();
});
