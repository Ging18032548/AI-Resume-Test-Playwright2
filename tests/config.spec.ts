import { test, expect } from '../fixtures/mockApi';

test.describe('Environment Configuration', () => {

  test('CONFIG-001 - application should respond successfully', async ({
    page,
  }) => {

    const response = await page.goto('/', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();

    const status = response?.status();

    console.log('Current URL:', page.url());
    console.log('HTTP Status:', status);

    expect(status).toBeLessThan(400);
  });

});