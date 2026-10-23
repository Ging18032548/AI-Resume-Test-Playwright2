import { test, expect } from '../fixtures/mockApi';
import { LoginPage } from '../pages/LoginPage';
import { JobsPage } from '../pages/JobsPage';
import { env, hasTestAccount } from '../utils/testData';

/**
 * ชุด test เฉพาะหน้า /jobs (Job Description management)
 *
 * รันเฉพาะ project: npx playwright test tests/jobs.spec.ts --project="Desktop Chrome"
 *
 * ⚠️ ทุก test รันบน MOCK_API ถ้า locator ใดไม่ตรงกับ DOM จริงของหน้า /jobs
 * ให้จับ selector ใหม่ด้วย: npx playwright codegen <BASE_URL>/jobs (หลัง login)
 */
test.describe('Jobs page (Job Description management)', () => {
  test.beforeEach(async () => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env (or use MOCK_API=true).');
  });

  test('JOBS-001 - renders page header and list without error state', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    await jobs.goto();

    await expect(jobs.heading).toBeVisible();
    await expect(page.locator('main')).not.toContainText(
      /something went wrong|internal server error|เกิดข้อผิดพลาด/i,
    );
  });

  test('JOBS-002 - shows empty state when no job descriptions exist', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();
    await jobs.goto();

    // mock state เริ่มต้นว่าง หน้า page ควรแสดงข้อความ empty state
    await expect(jobs.emptyState).toBeVisible();
    await expect(jobs.jobItems).toHaveCount(0);
  });

  test('JOBS-003 - creates a job description and it appears in the list', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);
    const jobTitle = `QA Engineer ${Date.now()}`;

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    await jobs.goto();

    await jobs.openCreateForm();
    await jobs.fillForm({
      title: jobTitle,
      company: 'LearnAce',
      description: 'Responsible for automated testing with Playwright and TypeScript.',
    });
    await jobs.save();

    // โหลดซ้ำเพื่อยืนยันว่าข้อมูลถูกบันทึกและดึงกลับมาแสดงได้
    await jobs.goto();
    await expect(jobs.jobItemByTitle(jobTitle)).toBeVisible();
  });

  test('JOBS-004 - blocks saving when required fields are empty', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    await jobs.goto();

    await jobs.openCreateForm();
    await jobs.save();

    // ต้องยังอยู่หน้า /jobs และไม่มีรายการถูกสร้าง
    // (error อาจมาจาก client-side validation หรือ 400 จาก API ก็ได้)
    const errorShown = await jobs.errorMessage.isVisible().catch(() => false);
    if (!errorShown) {
      await expect(page).toHaveURL(/\/jobs$/i);
    }

    await jobs.goto();
    await expect(jobs.jobItems).toHaveCount(0);
  });

  test('JOBS-005 - edits an existing job description', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);
    const originalTitle = `Frontend Dev ${Date.now()}`;
    const updatedTitle = `${originalTitle} (Updated)`;

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    // เตรียมข้อมูลผ่าน UI ก่อน
    await jobs.goto();
    await jobs.openCreateForm();
    await jobs.fillForm({
      title: originalTitle,
      description: 'Build web UI with React.',
    });
    await jobs.save();

    await jobs.goto();
    await jobs.editItem(originalTitle);
    await jobs.fillForm({ title: updatedTitle });
    await jobs.save();

    await jobs.goto();
    await expect(jobs.jobItemByTitle(updatedTitle)).toBeVisible();
    // mock state ของ test นี้มี job เดียว — หลังแก้ไขต้องเหลือ 1 รายการและชื่อต้องเปลี่ยนแล้ว
    await expect(jobs.jobItems).toHaveCount(1);
  });

  test('JOBS-006 - deletes a job description after confirmation', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);
    const jobTitle = `Temp Job ${Date.now()}`;

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    await jobs.goto();
    await jobs.openCreateForm();
    await jobs.fillForm({
      title: jobTitle,
      description: 'To be deleted by this test.',
    });
    await jobs.save();

    await jobs.goto();
    await expect(jobs.jobItemByTitle(jobTitle)).toBeVisible();

    await jobs.deleteItem(jobTitle);

    await jobs.goto();
    await expect(jobs.jobItemByTitle(jobTitle)).toHaveCount(0);
  });

  test('JOBS-007 - shows an error state when the jobs API fails', async ({ page }) => {
    const login = new LoginPage(page);
    const jobs = new JobsPage(page);

    await login.login(env.testEmail, env.testPassword);
    await login.expectLoggedIn();

    // override route ของ fixture (route ที่ลงทะเบียนทีหลังมี priority สูงกว่า)
    await page.route('**/api/jobs**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Internal Server Error' }),
      }),
    );

    await jobs.goto();

    await expect(
      jobs.errorState
        .or(
          page
            .locator('main')
            .getByText(/ผิดพลาด|ล้มเหลว|error|failed|internal server/i)
            .first(),
        )
        .first(),
    ).toBeVisible();
  });

  test('JOBS-008 - redirects unauthenticated visitors to sign-in', async ({ page }) => {
    // ไม่ login — ต้องถูกพากลับไปหน้า sign-in (พฤติกรรมจริงยืนยันแล้วจาก production)
    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/(sign-in|login)/i);
  });
});
