import { test, expect } from '../fixtures/mockApi';
import { LoginPage } from '../pages/LoginPage';
import { UploadResumePage } from '../pages/UploadResumePage';
import { env, hasRegistrationAccount } from '../utils/testData';

const duplicateMessage = /อีเมลนี้ถูกใช้งานแล้ว/i;

test('register, login, open resume page, and reject duplicate registration', async ({ page }) => {
  test.skip(
    !hasRegistrationAccount(),
    'Set REGISTRATION_NAME, REGISTRATION_EMAIL, and REGISTRATION_PASSWORD in .env to run registration flow.'
  );

  const auth = new LoginPage(page);
  const upload = new UploadResumePage(page);

  const registrationSuccess = page.getByText(
    /success|สมัครสมาชิกสำเร็จ|ลงทะเบียนสำเร็จ|ยินดีต้อนรับ/i,
  ).first();
  const duplicateAlert = page.getByText(duplicateMessage).first();
  const registrationError = page.getByRole('alert').first();

  await auth.registerFromSignIn(
    env.registrationName,
    env.registrationEmail,
    env.registrationPassword,
  );

  await expect.poll(async () => {
    const path = new URL(page.url()).pathname;
    return /\/(login|sign-in|dashboard|home)(\/|$)/i.test(path)
      || await registrationSuccess.isVisible().catch(() => false)
      || await duplicateAlert.isVisible().catch(() => false)
      || await registrationError.isVisible().catch(() => false);
  }, { message: 'Registration did not report success, an existing account, or an error' }).toBe(true);

  const alreadyRegistered = await duplicateAlert.isVisible().catch(() => false);
  const hasRegistrationError = await registrationError.isVisible().catch(() => false);
  if (hasRegistrationError && !alreadyRegistered) {
    const message = (await registrationError.innerText()).trim();
    throw new Error(`Registration was rejected by the application: ${message}`);
  }
  if (!alreadyRegistered) {
    const path = new URL(page.url()).pathname;
    const redirected = /\/(login|sign-in|dashboard|home)(\/|$)/i.test(path);
    const notified = await registrationSuccess.isVisible().catch(() => false);
    expect(redirected || notified, 'Expected a registration success notification or redirect').toBe(true);
  }

  // Always perform a fresh login so both new and previously registered accounts are exercised.
  await auth.login(env.registrationEmail, env.registrationPassword);
  await auth.expectLoggedIn();
  await upload.goto();
  await expect(page).toHaveURL(/\/resumes\/upload$/i);

  // ★ แก้ไขที่ 1: file input ของแอปเป็นแบบ hidden → ใช้ toBeAttached ไม่ใช่ toBeVisible
  await upload.expectReadyForUpload();

  // ★ แก้ไขที่ 2: ออกจากระบบก่อน กันแอปเด้งผู้ใช้ที่ล็อกอินอยู่ออกจากหน้า sign-in
  await auth.logout();

  // Re-submit the same account and verify the exact Thai duplicate-account message.
  await auth.registerFromSignIn(
    env.registrationName,
    env.registrationEmail,
    env.registrationPassword,
  );
  // ★ แก้ไขที่ 3: เพิ่ม .first() กัน strict-mode error ถ้าแอปแสดงข้อความ 2 ตำแหน่ง
  await expect(page.getByText(duplicateMessage).first()).toBeVisible();
});