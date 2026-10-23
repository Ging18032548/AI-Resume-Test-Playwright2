import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class UploadResumePage extends BasePage {
    readonly fileInput: Locator;
    readonly uploadButton: Locator;
    readonly analyzeButton: Locator;
    readonly selectedFile: Locator;
    readonly uploadError: Locator;
    readonly uploadedResume: Locator;

    constructor(page: Page) {
        super(page);
        this.fileInput = page.locator('input[type="file"]');
        this.uploadButton = page.getByRole('button', { name: /^Upload Resume$/i });
        this.analyzeButton = page.getByRole('button', { name: /^Analyze Resume$/i });
        this.selectedFile = page.locator('.selected-file');
        this.uploadError = page.locator('.upload-error, [role="alert"]').first();
        this.uploadedResume = page.locator('.upload-success');
    }

    async goto() {
        await this.page.goto('/resumes/upload', { waitUntil: 'domcontentloaded' });
    }

    // ★ เพิ่มใหม่: ตรวจว่าหน้าพร้อมรับไฟล์ — file input ของแอปเป็นแบบ hidden
    // จึงต้อง assert ด้วย toBeAttached (ตาม best practice ของ Playwright)
    async expectReadyForUpload() {
        await expect(this.fileInput).toBeAttached();
        await expect(this.fileInput).toBeEnabled();
    }

    async uploadResume(filePath: string) {
        await this.fileInput.setInputFiles(filePath);
    }

    async expectFileSelected(fileName: string) {
        await expect(this.selectedFile).toContainText(fileName);
    }

    async upload() {
        await expect(this.uploadButton).toBeEnabled();
        await this.uploadButton.click();
        await expect(this.uploadedResume).toBeVisible({ timeout: 30_000 });
    }

    async startAnalysis() {
        await expect(this.analyzeButton).toBeEnabled();
        await this.analyzeButton.click();
    }

    async expectUploadError(pattern: RegExp) {
        await expect(this.uploadError).toBeVisible();
        await expect(this.uploadError).toHaveText(pattern);
    }
}