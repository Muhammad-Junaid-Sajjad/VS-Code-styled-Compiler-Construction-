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

test('Execute compiles & runs C in the terminal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.explorer-file', { hasText: 'hello.c' }).click();
  await page.locator('#exec-btn').click();
  await expect(page.locator('.term-body .term-out')).toContainText('Hello CompileViz!', { timeout: 20_000 });
  await expect(page.locator('.term-body .term-exit')).toContainText('exit code: 0');
});

test('Execute runs Python in the terminal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.explorer-file', { hasText: 'hello.py' }).click();
  await page.locator('#exec-btn').click();
  await expect(page.locator('.term-body .term-out')).toContainText('30', { timeout: 20_000 });
});

test('terminal shell: typing commands works (help)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.btab', { hasText: 'TERMINAL' }).click();
  const ti = page.locator('.term-input');
  await ti.click();
  await ti.pressSequentially('help');
  await ti.press('Enter');
  await expect(page.locator('.term-body .term-cmd').last()).toContainText('help');
  await expect(page.locator('.term-body .term-out').last()).toContainText('run <sample>');
});

test('SC-010: all 4 phases render within 2 s of clicking Run', async ({ page }) => {
  await page.goto('/');
  const t0 = Date.now();
  await page.locator('#run-btn').click();
  await expect(page.locator('#sb-status')).toContainText('Compiled', { timeout: 5_000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(2000);
});
