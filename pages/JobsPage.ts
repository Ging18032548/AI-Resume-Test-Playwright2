import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object สำหรับหน้า /jobs (Job Description management)
 *
 * ⚠️ SELECTOR CALIBRATION:
 * หน้า /jobs เป็น protected route จึงต้อง login ก่อนถึงเห็น DOM จริง
 * ถ้า locator ใดไม่ตรงกับ DOM จริง ให้รัน `npx playwright codegen` เพื่อจับ
 * selector ที่แท้จริง แล้วปรับที่นี่ (ทุก locator มี fallback หลายรูปแบบอยู่แล้ว)
 */
export class JobsPage extends BasePage {
  readonly heading: Locator;
  readonly jobList: Locator;
  readonly jobItems: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;

  readonly addButton: Locator;

  // ฟอร์มสร้าง/แก้ไข job description (อาจเป็น modal หรือ inline form)
  readonly dialog: Locator;
  readonly titleInput: Locator;
  readonly companyInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page
      .locator('main')
      .getByRole('heading')
      .first();

    this.jobList = page.locator(
      '[data-testid="job-list"], ' +
        '[class*="job-list"], ' +
        '[class*="jobs-grid"], ' +
        'main ul',
    ).first();

    this.jobItems = page.locator(
      '[data-testid="job-item"], ' +
        '[class*="job-card"], ' +
        '[class*="job-item"], ' +
        'main li',
    );

    this.emptyState = page
      .locator('main')
      .getByText(/ยังไม่มี|ไม่มีข้อมูล|ไม่มีรายการ|no jobs?|empty|เริ่มต้นสร้าง|create your first/i)
      .first();

    this.errorState = page
      .locator('[role="alert"], .error-state, [class*="error"]')
      .filter({ hasText: /error|ผิดพลาด|ล้มเหลว|failed/i })
      .first();

    this.addButton = page
      .getByRole('button', { name: /add|create|new|เพิ่ม|สร้าง|เพิ่มตำแหน่ง/i })
      .first();

    this.dialog = page
      .locator('[role="dialog"], [class*="modal"], form')
      .first();

    // ฟอร์ม: ชื่อตำแหน่ง (text input แรก), บริษัท (ถ้ามี), รายละเอียด (textarea)
    this.titleInput = page.locator(
      '[data-testid="job-title"], ' +
        'input[name="title"], ' +
        'input[name="jobTitle"], ' +
        'input[placeholder*="ตำแหน่ง" i], ' +
        'input[placeholder*="title" i], ' +
        '[role="dialog"] input[type="text"], ' +
        'form input[type="text"]',
    ).first();

    this.companyInput = page.locator(
      '[data-testid="job-company"], ' +
        'input[name="company"], ' +
        'input[name="companyName"], ' +
        'input[placeholder*="บริษัท" i], ' +
        'input[placeholder*="company" i]',
    ).first();

    this.descriptionInput = page.locator(
      '[data-testid="job-description"], ' +
        'textarea[name="description"], ' +
        'textarea[name="jobDescription"], ' +
        'textarea[placeholder*="รายละเอียด" i], ' +
        'textarea[placeholder*="description" i], ' +
        'textarea',
    ).first();

    this.saveButton = page
      .getByRole('button', { name: /save|submit|create|บันทึก|สร้าง|เพิ่ม/i })
      .first();

    this.cancelButton = page
      .getByRole('button', { name: /cancel|ยกเลิก|ปิด/i })
      .first();

    this.errorMessage = page
      .locator('[role="alert"], .error-message, [class*="error"], .form-error')
      .first();

    this.successMessage = page
      .locator(
        '[role="status"], ' +
          '.success-message, ' +
          '[class*="success"], ' +
          '[data-testid="toast"]',
      )
      .first();
  }

  async goto() {
    await this.page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/jobs$/i);
  }

  /**
   * เปิดฟอร์มสร้าง job description ใหม่
   * ถ้าฟอร์มแสดงอยู่แล้ว (inline form) จะข้ามการกดปุ่ม add
   */
  async openCreateForm() {
    const formAlreadyOpen =
      (await this.titleInput.isVisible().catch(() => false)) ||
      (await this.descriptionInput.isVisible().catch(() => false));

    if (!formAlreadyOpen) {
      await expect(this.addButton).toBeVisible();
      await this.addButton.click();
    }

    await expect(this.titleInput.or(this.descriptionInput).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** กรอกฟอร์ม job description */
  async fillForm(data: { title: string; company?: string; description?: string }) {
    if (await this.titleInput.isVisible().catch(() => false)) {
      await this.titleInput.fill(data.title);
    }
    if (data.company && (await this.companyInput.isVisible().catch(() => false))) {
      await this.companyInput.fill(data.company);
    }
    if (data.description !== undefined) {
      await expect(this.descriptionInput).toBeVisible();
      await this.descriptionInput.fill(data.description);
    }
  }

  async save() {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
  }

  /** ค้นหา item ในลิสต์ด้วยชื่อตำแหน่งงาน */
  jobItemByTitle(title: string): Locator {
    return this.jobItems.filter({ hasText: title }).first();
  }

  /** กดปุ่มแก้ไขบน item ที่ระบุ */
  async editItem(title: string) {
    const item = this.jobItemByTitle(title);
    await expect(item).toBeVisible();
    await item
      .getByRole('button', { name: /edit|แก้ไข/i })
      .or(item.locator('[aria-label*="edit" i], [aria-label*="แก้ไข"]'))
      .first()
      .click();
    await expect(this.titleInput.or(this.descriptionInput).first()).toBeVisible();
  }

  /**
   * กดปุ่มลบบน item ที่ระบุ รองรับทั้ง native confirm() dialog
   * และ in-page confirmation modal
   */
  async deleteItem(title: string) {
    const item = this.jobItemByTitle(title);
    await expect(item).toBeVisible();

    // รองรับ native confirm dialog (ถ้า app ใช้) — accept ให้อัตโนมัติ
    let nativeDialogFired = false;
    const dialogPromise = this.page
      .waitForEvent('dialog', { timeout: 5_000 })
      .then((dialog) => {
        nativeDialogFired = true;
        return dialog.accept();
      })
      .catch(() => undefined);

    await item
      .getByRole('button', { name: /delete|remove|ลบ/i })
      .or(item.locator('[aria-label*="delete" i], [aria-label*="ลบ"]'))
      .first()
      .click();

    // in-page confirm modal (ถ้ามี) — best effort และต้องไม่ hang
    if (!nativeDialogFired) {
      const confirmButton = this.page
        .getByRole('button', { name: /^confirm|ยืนยันการลบ|ยืนยัน$/i })
        .first();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click({ timeout: 3_000 }).catch(() => undefined);
      }
    }

    if (nativeDialogFired) {
      await dialogPromise;
    }
  }
}
