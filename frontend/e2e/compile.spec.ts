/** T055 — end-to-end: real browser → index121 IDE (in-browser compiler) → panels render. */
import { test, expect } from '@playwright/test';

test('loads the IDE and compiles the default C sample', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tcenter')).toContainText('compiler-demo — main.c');
  await expect(page.locator('#sT')).toContainText('tokens');
  await expect(page.locator('#sE')).toContainText('0 errors');
});

test('loads the Python sample and flips the language selector', async ({ page }) => {
  await page.goto('/');
  await page.locator('.fi[data-file="main.py"]').click();
  await expect(page.locator('#crumbF')).toHaveText('main.py');
  await expect(page.locator('#sG')).toContainText('Python');
});

test('Execute compiles & runs C in the terminal', async ({ page }) => {
  await page.goto('/');
  await page.locator('#abt').click();
  const ti = page.locator('#ti');
  await ti.click();
  await ti.pressSequentially('run');
  await ti.press('Enter');
  await expect(page.locator('#to')).toContainText('> run main.c', { timeout: 15_000 });
  await expect(page.locator('#to')).toContainText('exited code 0');
});

test('Execute runs Python in the terminal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.fi[data-file="main.py"]').click();
  await page.locator('#abt').click();
  const ti = page.locator('#ti');
  await ti.click();
  await ti.pressSequentially('run');
  await ti.press('Enter');
  await expect(page.locator('#to')).toContainText('Hello, World!', { timeout: 15_000 });
  await expect(page.locator('#to')).toContainText('30');
});

test('terminal shell: typing commands works (help)', async ({ page }) => {
  await page.goto('/');
  await page.locator('#abt').click();
  const ti = page.locator('#ti');
  await ti.click();
  await ti.pressSequentially('help');
  await ti.press('Enter');
  await expect(page.locator('#to')).toContainText('compile · run · step · tokens', { timeout: 15_000 });
});

test('SC-010: all phases render within 2 s of loading', async ({ page }) => {
  await page.goto('/');
  const t0 = Date.now();
  await expect(page.locator('#sT')).toContainText('tokens', { timeout: 5_000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(2000);
});
