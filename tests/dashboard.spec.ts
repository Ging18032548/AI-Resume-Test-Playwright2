import { test, expect } from '../fixtures/mockApi';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import {
  hasTestAccount,
  testEmail,
  testPassword,
} from '../utils/testData';

test.describe('Dashboard Page Tests', () => {
  test.beforeEach(async () => {
    test.skip(!hasTestAccount(), 'Set TEST_EMAIL and TEST_PASSWORD in .env to run dashboard checks.');
  });

  test('DASHBOARD-001 - should login and load dashboard successfully', async ({
    page,
  }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    // Login
    await login.login(
      testEmail,
      testPassword
    );

    // Verify login success
    await login.expectLoggedIn();

    // Verify dashboard
    await dashboard.goto();

    await expect(page).toHaveURL(
      /\/dashboard$/i
    );
  });

});