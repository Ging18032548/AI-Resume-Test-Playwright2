import { test, expect } from '../fixtures/mockApi';

test.describe('Application Smoke Test', () => {

  test('SMOKE-001 - application should be reachable', async ({ page }) => {

    const response = await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();

    const status = response?.status();

    console.log('BASE URL:', process.env.BASE_URL);
    console.log('Response status:', status);
    console.log('Current URL:', page.url());

    expect(status).toBeLessThan(400);
  });

});