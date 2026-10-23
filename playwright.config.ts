import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const baseURL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',

  outputDir: './test-results',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  timeout: 90_000,

  expect: {
    timeout: 15_000,
  },

  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'playwright-report',
      // เปิดรายงานเองเมื่อมีความล้มเหลว เพื่อไม่ให้เด้งเบราว์เซอร์ทุกครั้งบน CI
      open: 'on-failure',
    }],
  ],

  use: {
    baseURL,

    actionTimeout: 15_000,

    navigationTimeout: 30_000,

    trace: 'retain-on-failure',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    ignoreHTTPSErrors: true,

    // Playwright default คือ headless — จะเปิดหน้าต่าง browser ด้วย npm run test:headed
  },

  // ★★★ เพิ่มใหม่: เปิด frontend ให้อัตโนมัติถ้ายังไม่ได้รัน ★★★
  // วางระดับเดียวกับ use / projects (top-level ของ defineConfig)
  webServer: {
    command: 'npm run dev',
    url: baseURL,                       // ใช้ค่าเดียวกับ BASE_URL ใน .env
    cwd: '../AI-Resume-Frontend',       // ← แก้เป็น path โฟลเดอร์ frontend จริงของคุณ!
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1920,
          height: 1080,
        },
      },
    },

    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: 1920,
          height: 1080,
        },
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },

    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
});