import { chromium } from '@playwright/test';

const results = [];
function rec(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch();
const p = await b.newPage();
const jsErrors = [];
p.on('pageerror', e => jsErrors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });

await p.goto('http://localhost:5000/');
await p.waitForTimeout(1500);

// ── helpers ─────────────────────────────────────────────────────────────
async function swapTab(tab) { await p.locator(`.pt[data-p="${tab}"]`).click(); await sleep(250); }
async function switchFile(f) {
  await p.locator(`.fi[data-file="${f}"]`).click();
  await sleep(900);
}
async function setCode(lang, code) {
  const file = lang === 'python' ? 'main.py' : 'main.c';
  if ((await p.locator('#crumbF').textContent()).trim() !== file) await switchFile(file);
  await p.locator('#code').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, code);
  await sleep(900);
}
async function panelCounts() {
  return {
    toks: +await p.locator('#cT').textContent(),
    syms: +await p.locator('#cS').textContent(),
    ir: +await p.locator('#cI').textContent(),
    errs: +await p.locator('#cE').textContent(),
    par: +await p.locator('#pPar').textContent(),
    opt: +await p.locator('#pOpt').textContent(),
    exe: (await p.locator('#pExe').textContent()).trim(),
  };
}
async function termRun() {
  await p.locator('#abt').click();
  await sleep(200);
  const ti = p.locator('#ti');
  await ti.click(); await ti.pressSequentially('run'); await ti.press('Enter');
  await sleep(2500);
  return await p.locator('#to').innerText();
}
async function termCmd(cmd) {
  await p.locator('#abt').click();
  await sleep(150);
  const ti = p.locator('#ti');
  await ti.click(); await ti.fill(cmd); await ti.press('Enter');
  await sleep(700);
}

const BADGE = (await p.locator('#sBe').textContent()).trim();
rec('statusbar backend badge', BADGE.includes('backend'), BADGE);

// ═══════════════════ PROGRAM 1: VALID C ────────────────────────────────
console.log('\n── PROGRAM: VALID C ──');
await setCode('c', '#include <stdio.h>\nint add(int a, int b) { return a + b; }\nint main() {\n  int x = 7, r;\n  r = add(x, 5);\n  printf("sum=%d\\n", r);\n  return 0;\n}\n');
let c = await panelCounts();
rec('C compile: tokens', c.toks > 5, `tokens=${c.toks} syms=${c.syms} ir=${c.ir} errs=${c.errs}`);
rec('C compile: symbols', c.syms > 3, `syms=${c.syms}`);
rec('C compile: IR', c.ir > 1, `ir=${c.ir}`);
rec('C compile: zero errors', c.errs === 0, `errs=${c.errs}`);

for (const tab of ['tokens', 'symbols', 'parse', 'ir', 'opt', 'insights', 'problems']) {
  await swapTab(tab); await sleep(150);
  const txt = (await p.locator('#pc').innerText() || '').trim();
  rec(`panel render: ${tab}`, txt.length > 0, `${txt.length} chars`);
}
await swapTab('debug'); await sleep(150);
const dbg = (await p.locator('#pc').innerText() || '').trim();
rec('panel render: debug(VM)', dbg.length > 0, `${dbg.length} chars`);

const outC = await termRun();
rec('C run: backend real output sum=12', outC.includes('sum=12'), outC.split('\n').slice(-4).join('|'));

// ═══════════════════ PROGRAM 2: PSEUDO C ───────────────────────────────
console.log('\n─── PSEUDO C (no main → ECPECT VM fallback) ───');
await setCode('c', 'int x = 5;\nint y = 10;\nint z = x + y * 2;\nif (z > 10) { z = z - 1; } else { z = z + 1; }\nwhile (z > 0) { z = z - 1; }');
c = await panelCounts();
rec('Pseudo-C compile: tokens', c.toks > 0, `tokens=${c.toks}`);
rec('Pseudo-C compile: zero errors', c.errs === 0, `errs=${c.errs}`);
const outPC = await termRun();
rec('Pseudo-C run: VM [state] printed', outPC.includes('[state]'), outPC.split('\n').slice(-3).join('|'));
rec('Pseudo-C run: exited code 0', outPC.includes('exited code 0'), '');

// ═══════════════════ PROGRAM 3: PYTHON ─────────────────────────────────
console.log('\n─── PROGRAM: PYTHON (main.py) ───');
await setCode('python', "def square(n):\n    return n * n\nx: int = 5\ny: int = 10\nz = x + y\nif z > 10:\n    temp = z * 2\n    print(temp)\nelse:\n    z = z - 1\nmsg = 'Hello, World!'\nprint(msg)");
c = await panelCounts();
rec('Python compile: tokens', c.toks > 5, `tokens=${c.toks} syms=${c.syms} errs=${c.errs}`);
rec('Python compile: zero errors', c.errs === 0, `errs=${c.errs}`);
for (const tab of ['tokens', 'symbols', 'parse', 'insights']) {
  await swapTab(tab); await sleep(150);
  const txt = (await p.locator('#pc').innerText() || '').trim();
  rec(`Python panel render: ${tab}`, txt.length > 0, `${txt.length} chars`);
}
const outPy = await termRun();
rec('Python run: backend python3 output', outPy.includes('Hello, World!'), outPy.split('\n').slice(-3).join('|'));

// ═══════════════════ PROGRAM 4: PYTHON LOOP ────────────────────────────
console.log('\n─── PROGRAM: PYTHON (loop/factorial) ───');
await setCode('python', "def fact(n):\n    f = 1\n    for i in range(1, n + 1):\n        f = f * i\n    return f\nprint(fact(5))");
c = await panelCounts();
rec('Python-loop compile: tokens', c.toks > 5, `tokens=${c.toks} errs=${c.errs}`);
const outPl = await termRun();
rec('Python-loop run: backend output 120', outPl.includes('120'), outPl.split('\n').slice(-3).join('|'));

/* TEST5
// ═══════════════════ FEATURES: theme / palette / debug ─────────────────
console.log('\n─── IDE FEATURES ───');
// theme toggle
await swapTab('terminal'); await termCmd('theme');
const thmBefore = await p.locator('body').getAttribute('data-theme');
await swapTab('terminal'); await termCmd('theme');
const thmAfter = await p.locator('body').getAttribute('data-theme');
rec('theme toggle toggles', thmBefore !== thmAfter, `${thmBefore}->${thmAfter}`);
// command palette opens
await p.keyboard.press('Control+Shift+P'); await sleep(300);
const palOpen = await p.locator('#pal').isVisible();
rec('command palette opens (Ctrl+Shift+P)', palOpen, '');
await p.keyboard.press('Escape'); await sleep(200);
// debugger step
await setCode('c', 'int x = 0;\nx = x + 5;\nx = x + 10;');
await swapTab('debug'); await sleep(200);
const stepper = p.locator('#dRst');
rec('debugger panel has Step button', await stepper.count() === 1, '');
if (await stepper.count()) {
  await p.locator('#dStep').click(); await sleep(200);
  rec('debugger Step advances pc', true, '');
}
*/

await b.close();
const fails = results.filter(r => !r.ok).length;
console.log(`\n════╡ LIVE AUDIT: ${results.length} checks, ${results.length - fails} passed, ${fails} failed ╞════`);
if (jsErrors.length) console.log('JS ERRORS DETECTED:\n  ' + jsErrors.join('\n  '));
else console.log('No JS/console errors detected.');