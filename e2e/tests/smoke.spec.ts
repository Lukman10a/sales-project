import { expect, test } from '@playwright/test';

test('a new owner can sign up and lands on the dashboard', async ({ page }) => {
  const email = `smoke+${Date.now()}@e2e.luxa.app`;
  const password = 'Smoke-test-pass-2026';

  await page.goto('/auth/signup');
  await page.locator('#firstName').fill('Ada');
  await page.locator('#lastName').fill('Smoke');
  await page.locator('#businessName').fill('Smoke Test Store');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(
    page.getByRole('heading', { level: 1, name: /, Ada!/ }),
  ).toBeVisible();
});
