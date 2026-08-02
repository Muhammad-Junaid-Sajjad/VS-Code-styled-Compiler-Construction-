/** T055+ / live UI coverage — every button, tab, and option exercised. */
import { test, expect } from '@playwright/test';

test('title bar, activity bar, and initial empty states render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app-title')).toContainText('CompileViz');
  await expect(page.locator('#activity-bar .act-btn').first()).toBeVisible();
  // Empty states before any run (FR-042)
  await expect(page.locator('#bp-tokens')).toContainText('No tokens yet');
  await expect(page.locator('#bp-ir')).toContainText('No IR yet');
  await expect(page.locator('#bp-diagnostics')).toContainText('No diagnostics');
});

test('every explorer sample loads and flips language', async ({ page }) => {
  await page.goto('/');
  const names = ['hello.c', 'arithmetic.c', 'factorial.c', 'input1.c', 'input2.c',
    'input3.c', 'test.c', 'hello.py', 'functions.py'];
  for (const name of names) {
    await page.locator('.explorer-file', { hasText: name }).click();
    await expect(page.locator('#tab-label')).toHaveText(name);
    if (name.endsWith('.py')) {
      await expect(page.locator('#sb-lang')).toContainText('Python');
    } else {
      await expect(page.locator('#sb-lang')).toContainText('C Language');
    }
  }
});

test('run compiles and all four bottom/right tabs show content', async ({ page }) => {
  await page.goto('/');
  await page.locator('#run-btn').click();
  await expect(page.locator('#sb-status')).toContainText('Compiled', { timeout: 15_000 });

  // Bottom tabs
  await page.locator('.btab', { hasText: 'TOKENS' }).click();
  await expect(page.locator('#bp-tokens .token-line').first()).toBeVisible();
  await page.locator('.btab', { hasText: 'IR CODE' }).click();
  await expect(page.locator('#bp-ir .ir-line').first()).toBeVisible();
  await page.locator('.btab', { hasText: 'DIAGNOSTICS' }).click();
  await expect(page.locator('#bp-diagnostics')).toBeVisible();

  // Right tabs
  await page.locator('.rtab', { hasText: 'Phases' }).click();
  await expect(page.locator('#rp-phaseFlow .phase-step').first()).toBeVisible();
  await page.locator('.rtab', { hasText: 'Tree' }).click();
  await expect(page.locator('#rp-parseTree .tree-label').first()).toBeVisible();
  await page.locator('.rtab', { hasText: 'Symbols' }).click();
  await expect(page.locator('#rp-symbolTable .sym-table').first()).toBeVisible();
});

test('Ctrl+Enter triggers compilation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#editor-area .cm-content').click();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#sb-status')).toContainText('Compiled', { timeout: 15_000 });
});

test('status bar: language selector toggles C/Python and theme toggles light/dark', async ({ page }) => {
  await page.goto('/');
  const lang = page.locator('#sb-lang');
  await lang.click();
  await expect(lang).toContainText('Python');
  await lang.click();
  await expect(lang).toContainText('C Language');

  const theme = page.locator('#sb-theme');
  await expect(page.locator('#app').first()).not.toHaveAttribute('data-theme', 'light');
  await theme.click();
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'light');
  await theme.click();
  await expect(page.locator('#app')).not.toHaveAttribute('data-theme', 'light');
});

test('compile failure surfaces a diagnostic + toast', async ({ page }) => {
  await page.goto('/');
  await page.locator('.explorer-file', { hasText: 'input3.c' }).click();  // duplicate-declaration error
  await page.locator('#run-btn').click();
  await expect(page.locator('#sb-status')).toContainText('Compiled', { timeout: 15_000 });
  await page.locator('.btab', { hasText: 'DIAGNOSTICS' }).click();
  await expect(page.locator('#bp-diagnostics')).toContainText('Multiple declarations');
  await expect(page.locator('#toast')).toBeVisible();
});
