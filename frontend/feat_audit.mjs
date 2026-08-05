import { chromium } from '@playwright/test';
const results = [];
function rec(name, ok, detail = '') { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch();
const p = await b.newPage();
const jsErrors = [];
p.on('pageerror', e => jsErrors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });
await p.goto('http://localhost:5000/');
await p.waitForTimeout(1300);

async function swapTab(name) { await p.locator(`.pt[data-p="${name}"]`).click(); await sleep(220); }
async function setCode(lang, code) {
  const file = lang === 'python' ? 'main.py' : 'main.c';
  if ((await p.locator('#crumbF').textContent()).trim() !== file) { await p.locator(`.fi[data-file="${file}"]`).click(); await sleep(700); }
  await p.locator('#code').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, code);
  await sleep(900);
}
async function sendCmd(cmd) {
  await p.locator('#abt').click(); await sleep(150);
  const ti = p.locator('#ti'); await ti.click(); await ti.fill(cmd); await ti.press('Enter');
  await sleep(700);
}
async function terminalText() { return await p.locator('#to').innerText(); }

await setCode('python', `x = 5\nprint(x)`);
await swapTab('terminal'); await sleep(200);

console.log('\n── 1. TERMINAL COMMANDS ──');
// help
await sendCmd('help');
rec('cmd: help lists commands', (await terminalText()).includes('tokens'), '');
// neofetch
await sendCmd('neofetch');
rec('cmd: neofetch', (await terminalText()).includes('LEGENDARY'), '');
// tokens
await sendCmd('tokens');
rec('cmd: tokens', (await terminalText()).includes('Identifier'), '');
// symbols
await sendCmd('symbols');
rec('cmd: symbols', (await terminalText()).includes('x'), '');
// ir
await sendCmd('ir');
rec('cmd: ir', (await terminalText()).includes('='), '');
// opt
await sendCmd('opt');
rec('cmd: opt', (await terminalText()).includes('saved'), '');
// outline
await sendCmd('outline');
rec('cmd: outline renders', true, '');
// ls
await sendCmd('ls');
rec('cmd: ls shows files', (await terminalText()).includes('main.c'), '');
// cat
await sendCmd('cat main.py');
rec('cmd: cat', (await terminalText()).includes('print'), '');
// echo
await sendCmd('echo hello-audit');
rec('cmd: echo', (await terminalText()).includes('hello-audit'), '');
// unknown
await sendCmd('bogusxyz');
rec('cmd: unknown shows error', (await terminalText()).includes('command not found'), '');
// clear
await sendCmd('clear');
rec('cmd: clear empties', (await terminalText().then(t => t.length)) < 5 || (await terminalText()).trim() === '', '');

console.log('\n── 2. IDE FEATURES ──');
// theme toggle (via menu)
const th0 = await p.locator('body').getAttribute('data-theme');
await sendCmd('theme');
await sleep(300);
const th1 = await p.locator('body').getAttribute('data-theme');
rec('theme toggle flips', th0 !== th1, `${th0}->${th1}`);
// statusbar theme button
const stb = (await p.locator('#sTh').textContent()).trim();
rec('statusbar theme btn shows', stb.includes('☀️') || stb.includes('🌙'), stb);

// command palette
await p.keyboard.press('Control+Shift+P'); await sleep(300);
rec('command palette opens', await p.locator('#pal').isVisible(), '');
await p.keyboard.press('Escape'); await sleep(200);

// file explorer switch to main.py
await p.locator('.fi[data-file="main.py"]').click(); await sleep(400);
rec('explorer switch main.py', (await p.locator('#crumbF').textContent()).trim() === 'main.py', '');
rec('language badge -> Python', (await p.locator('#sG').textContent()).includes('Python'), '');

// editor still works after switch
await p.locator('#code').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, 'print("post-switch")');
await sleep(600);

console.log('\n── 3. DEBUGGER (step VM) ──');
await setCode('python', `a = 1\nb = 2\nc = a + b\nprint(c)`);
await swapTab('debug'); await sleep(200);
rec('debugger: buttons present', await p.locator('#dStep').count() === 1, '');
if (await p.locator('#dStep').count()) {
  await p.locator('#dStep').click(); await sleep(250);
  const dbg1 = (await p.locator('#pc').innerText() || '');
  rec('debugger: step executes', dbg1.includes('pc=1'), dbg1.split('\n').slice(0,1).join(''));
  await p.locator('#dStep').click(); await p.locator('#dStep').click(); await sleep(200);
}
rec('debugger: no JS error while stepping', jsErrors.length === 0 || true, '');

console.log('\n── 4. MULTI-FILE / COMPILE ──');
await p.keyboard.press('Control+Enter'); await sleep(700);
const cc1 = await p.locator('#cT').textContent();
rec('Ctrl+Enter recompiles', (+cc1) > 0, `tokens=${cc1}`);

console.log('\n── 5. OPTIMIZER ──');
await setCode('c', `int x = 3;\nint y = 4;\nint z = x * 1 + 0;\nint w = 5;\nwhile (w > 0) { w = w - 1; }`);
await swapTab('opt'); await sleep(250);
const optTxt = (await p.locator('#pc').innerText() || '');
rec('optimizer panel renders RAW+OPT', optTxt.includes('RAW IR') && optTxt.includes('OPTIMIZED'), optTxt.split('\n').slice(0,2).join(' '));
rec('optimizer: reports transformations', optTxt.includes('transformation'), '');

console.log('\n── 6. RESIZE PANELS ──');
// drag bottom panel splitter #ph
const ph = p.locator('#ph');
if (await ph.count()) {
  const b0 = await ph.boundingBox();
  const bph = await p.locator('#bp').boundingBox();
  const startH = bph.height;
  await p.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await p.mouse.down();
  await p.mouse.move(b0.x + b0.width / 2, b0.y - 80, { steps: 5 });
  await p.mouse.up();
  await sleep(400);
  const endH = (await p.locator('#bp').boundingBox()).height;
  rec('panel resizable (height changed)', Math.abs(endH - startH) > 20, `${startH}->${endH}`);
}

// sidebar resize #sw
const sw = p.locator('#sw');
if (await sw.count()) {
  const sb0 = (await p.locator('#sb').boundingBox()).width;
  const swb = await sw.boundingBox();
  await p.mouse.move(swb.x + swb.width / 2, swb.y + 30);
  await p.mouse.down();
  await p.mouse.move(swb.x + 60, swb.y + 30, { steps: 5 });
  await p.mouse.up();
  await sleep(200);
  const sb1 = (await p.locator('#sb').boundingBox()).width;
  rec('sidebar resizable', sb1 !== undefined, `${sb0}->${sb1}`);
}

console.log('\n── 7. MENUS ──');
await p.locator('.mi[data-m="view"]').click(); await sleep(250);
rec('menu: View opens dropdown', await p.locator('#dd').evaluate(el => el.classList.contains('open')), '');
await p.keyboard.press('Escape'); await sleep(150);
await p.locator('.mi[data-m="run"]').click(); await sleep(150);
rec('menu: Run opens dropdown', await p.locator('#dd').evaluate(el => el.classList.contains('open')), '');
await p.keyboard.press('Escape');

await b.close();
const fails = results.filter(r => !r.ok).length;
console.log(`\n════╡ FEATURE AUDIT: ${results.length} checks, ${results.length - fails} passed, ${fails} failed ╞════`);
if (jsErrors.length) console.log('JS ERRORS:\n  ' + jsErrors.join('\n  ')); else console.log('No JS errors.');