// LIVE browser monitoring harness — a real (headed) Chromium window on :0 that
// continuously exercises the whole UI and never stops. Every step logs
// [PASS]/[FAIL] to stdout; console/page errors are surfaced live. On a FAIL it
// keeps going — the browser stays open until it is killed.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5000';
const samples = ['hello.c', 'arithmetic.c', 'factorial.c', 'input1.c', 'input2.c',
  'input3.c', 'test.c', 'hello.py', 'functions.py'];

let pass = 0, fail = 0;

async function check(page, name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  [PASS] ${name}`);
  } catch (e) {
    fail++;
    console.log(`  [FAIL] ${name}: ${String(e.message).split('\n')[0]}`);
  }
}

async function runSample(page, s) {
  await check(page, `load ${s}`, async () => {
    await page.locator('.explorer-file', { hasText: s }).click();
    await page.locator('#tab-label').waitFor({ state: 'visible' });
  });
  await check(page, `compile ${s}`, async () => {
    await page.locator('#run-btn').click();
    await page.waitForFunction(
      () => !document.getElementById('run-btn').classList.contains('running'),
      { timeout: 20000 },
    );
  });
}

async function main() {
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const runtimeErrors = [];
  page.on('pageerror', (e) => runtimeErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') runtimeErrors.push('console: ' + m.text()); });
  page.on('crash', () => runtimeErrors.push('PAGE CRASHED'));

  await page.goto(BASE);
  console.log(`\n[LIVE] browser opened at ${BASE} — window is visible on your screen`);
  console.log(`[LIVE] monitoring forever; press Ctrl+C or kill the task to stop.\n`);

  let cycle = 0;
  while (true) {
    cycle++;
    console.log(`\n===== LIVE MONITOR CYCLE ${cycle} =====`);

    // 1) Every sample: load → compile → verify panels populated
    for (const s of samples) {
      await runSample(page, s);
      await check(page, `tokens panel for ${s}`, async () => {
        await page.locator('.btab', { hasText: 'TOKENS' }).click();
        await page.waitForSelector('#bp-tokens .token-line', { timeout: 10000 });
      });
      await check(page, `IR panel for ${s}`, async () => {
        await page.locator('.btab', { hasText: 'IR CODE' }).click();
      });
      await check(page, `tree panel for ${s}`, async () => {
        await page.locator('.rtab', { hasText: 'Tree' }).click();
      });
      await check(page, `symbols panel for ${s}`, async () => {
        await page.locator('.rtab', { hasText: 'Symbols' }).click();
      });
    }

    // 2) Every tab + toggle
    for (const t of ['TOKENS', 'IR CODE', 'DIAGNOSTICS']) {
      await check(page, `bottom tab ${t}`, async () => page.locator('.btab', { hasText: t }).click());
    }
    for (const t of ['Phases', 'Tree', 'Symbols']) {
      await check(page, `right tab ${t}`, async () => page.locator('.rtab', { hasText: t }).click());
    }
    await check(page, 'language selector toggles', async () => { await page.locator('#sb-lang').click(); });
    await check(page, 'theme toggles light/dark', async () => { await page.locator('#sb-theme').click(); });
    await check(page, 'Ctrl+Enter compiles', async () => {
      await page.locator('#editor-area .cm-content').click();
      await page.keyboard.press('Control+Enter');
      await page.waitForFunction(
        () => !document.getElementById('run-btn').classList.contains('running'),
        { timeout: 20000 },
      );
    });

    // 3) Surface runtime console/page errors
    if (runtimeErrors.length) {
      fail += runtimeErrors.length;
      console.log('  [FAIL] runtime errors detected:');
      for (const e of runtimeErrors) console.log(`         ${e}`);
      runtimeErrors.length = 0;
    }

    console.log(`[LIVE] cycle ${cycle} done — cumulative pass=${pass} fail=${fail}`);
    await page.waitForTimeout(1500);
  }
}

main().catch((e) => { console.error('[LIVE] fatal:', e); process.exit(1); });
