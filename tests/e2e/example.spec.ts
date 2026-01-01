import { test, expect } from '@playwright/test';

test('/ has header', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('header')).toBeVisible();
});

test('/auth has header', async ({ page }) => {
  await page.goto('/auth');

  await expect(page.getByTestId('header')).toBeVisible();
});
