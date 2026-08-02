/** T055 — end-to-end: real browser → SPA → /api/compile → panels render. */
import { test, expect } from '@playwright/test';

test('loads the IDE and compiles the hello sample', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app-title')).toContainText('CompileViz');
  await page.locator('#run-btn').click();
  // Tokens panel populates (non-empty) and status reports compiled.
  await expect(page.locator('#sb-status')).toContainText('Compiled', { timeout: 15_000 });
  await expect(page.locator('#bp-tokens .token-line').first()).toBeVisible();
});

test('loads a Python sample and flips the language selector', async ({ page }) => {
  await page.goto('/');
  await page.locator('.explorer-file', { hasText: 'hello.py' }).click();
  await expect(page.locator('#sb-lang')).toContainText('Python');
});

test('SC-010: all 4 phases render within 2 s of clicking Run', async ({ page }) => {
  await page.goto('/');
  const t0 = Date.now();
  await page.locator('#run-btn').click();
  await expect(page.locator('#sb-status')).toContainText('Compiled', { timeout: 5_000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(2000);
});
