/** T055+ / live UI coverage — every button, tab, and option exercised in index121 UI. */
import { test, expect } from '@playwright/test';

test('title bar, activity bar, and initial panel states render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tcenter')).toContainText('compiler-demo — main.c');
  await expect(page.locator('#ab .ab').first()).toBeVisible();
  await expect(page.locator('#pt .pt').first()).toHaveText(/Tokens/);
});

test('every explorer file loads and flips language', async ({ page }) => {
  await page.goto('/');
  const names = ['main.c', 'main.py'];
  for (const name of names) {
    await page.locator(`.fi[data-file="${name}"]`).click();
    await expect(page.locator('#crumbF')).toHaveText(name);
    await expect(page.locator('#sG')).toContainText(name.endsWith('.py') ? 'Python' : 'C');
  }
});

test('compile populates tokens, symbols, IR, and parse-tree tabs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sT')).toContainText('tokens', { timeout: 15_000 });

  await page.locator('.pt[data-p="tokens"]').click();
  await expect(page.locator('#pc table.tb tr').first()).toBeVisible();

  await page.locator('.pt[data-p="symbols"]').click();
  await expect(page.locator('#pc table.tb').first()).toBeVisible();

  await page.locator('.pt[data-p="parse"]').click();
  await expect(page.locator('#pc .tr').first()).toBeVisible();

  await page.locator('.pt[data-p="ir"]').click();
  await expect(page.locator('#pc .irl').first()).toBeVisible();
});

test('Ctrl+Enter triggers compilation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#code').click();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#sT')).toContainText('tokens', { timeout: 15_000 });
});

test('status bar: language selector toggles C/Python and theme toggles light/dark', async ({ page }) => {
  await page.goto('/');
  await page.locator('#lang').selectOption('python');
  await expect(page.locator('#sG')).toContainText('Python');
  await page.locator('#lang').selectOption('c');
  await expect(page.locator('#sG')).toContainText('C');

  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#thm').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.locator('#thm').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
});

test('tokens panel shows a total token count after run', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#cT')).toHaveText(/\d+/);
  await page.locator('.pt[data-p="tokens"]').click();
  await expect(page.locator('#pc table.tb tr').first()).toBeVisible();
});

test('side and bottom panels are resizable by dragging', async ({ page }) => {
  await page.goto('/');
  // Wait for the splash screen to be removed so it doesn't intercept mouse events.
  await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 10_000 });

  const sb = page.locator('#sb');
  const before = await sb.evaluate((el) => el.offsetWidth);
  const bb = await page.locator('#sh').boundingBox();
  const sx = Math.round(bb!.x + bb!.width / 2);
  const sy = Math.round(bb!.y + bb!.height / 2);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(Math.max(0, sx + 40), sy, { steps: 4 });
  await page.mouse.up();
  const after = await sb.evaluate((el) => el.offsetWidth);
  expect(Math.abs(after - before)).toBeGreaterThan(10);

  const bp = page.locator('#bp');
  const bbefore = await bp.evaluate((el) => el.offsetHeight);
  const bbox = await page.locator('#ph').boundingBox();
  const bx = Math.round(bbox!.x + bbox!.width / 2);
  const by = Math.round(bbox!.y + bbox!.height / 2);
  await page.mouse.move(bx, by);
  await page.mouse.down();
  await page.mouse.move(bx, Math.max(0, by - 40), { steps: 4 });
  await page.mouse.up();
  const bafter = await bp.evaluate((el) => el.offsetHeight);
  expect(Math.abs(bafter - bbefore)).toBeGreaterThan(10);
});

test('compile failure surfaces a diagnostic in Problems and a toast', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const c = document.getElementById('code');
    c.value = 'int main() {\n    int x = 5\n    return 0;\n}\n';
  });
  await page.locator('#cbtn').click();
  await expect(page.locator('#sE')).toContainText('1 errors', { timeout: 15_000 });
  await page.locator('.pt[data-p="problems"]').click();
  await expect(page.locator('#pc')).toContainText("Expected ';'");
});
