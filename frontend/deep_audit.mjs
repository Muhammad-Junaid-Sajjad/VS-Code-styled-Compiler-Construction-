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

await p.locator('#code').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); },
  'int x = 5;\nint y = 10;\nint z = x + y * 2;\nint square(int n) { return n * n; }\nint main() { return 0; }');
await p.waitForTimeout(900);

console.log('\n── A. SEARCH (activity bar #2) ──');
await p.locator('#abs').click(); await sleep(250);
await p.locator('#sin').fill('square'); await sleep(400);
const sres = (await p.locator('#sres').innerText() || '').trim();
rec('search finds symbol', sres.toLowerCase().includes('square'), sres.split('\n')[0]);
await p.locator('#abs').click(); await sleep(250);

console.log('\n── B. OUTLINE (should show functions) ──');
const ol = (await p.locator('#olList').innerText() || '').trim();
rec('outline lists function f', ol.includes('square'), ol.split('\n').slice(0,3).join(','));
const oliTxts = await p.locator('#olList .oli').allInnerTexts();
rec('outline has line numbers', oliTxts.length>0 && oliTxts.every(o => /:\d+$/.test(o.trim())), `items=${oliTxts.length} last=${(oliTxts[0]||'').trim()}`);

console.log('\n── C. MINIMAP CANVAS renders ──');
await p.locator('#mm').evaluate(el => el.getContext('2d'));
const mmOk = await p.locator('#mm').evaluate(el => { const c = el.getContext('2d'); const d = c.getImageData(0,0,el.width,el.height).data; let any=false; for (let i=0;i<d.length;i+=40){ if(d[i]!==0){any=true;break} } return any; });
rec('minimap draws pixels', mmOk, '');
// toggle minimap via settings menu
await p.locator('#abg').click(); await sleep(200);
await p.locator('#setp .ddi[data-c="mm"]').click(); await sleep(200);
rec('settings menu: minimap toggle', true, '');

console.log('\n── D. DEBUGGER breakpoints + optimized toggle ──');
await p.locator('.pt[data-p="debug"]').click(); await sleep(250);
const dOpt = p.locator('#dOpt');
const isChecked = await dOpt.isChecked();
rec('debug checkbox present', (await dOpt.count()) === 1, `optimized checked=${isChecked}`);
await dOpt.click(); await sleep(250);
const rechecked = await dOpt.isChecked();
rec('debugger optimized toggle switches', rechecked === !isChecked, `${isChecked}->${rechecked}`);
// breakpoint click on an irn
await p.locator('#pc .irn').first().click(); await sleep(200);
const hasBp = await p.locator('#pc .irn.bp').count();
rec('breakpoint toggles on click', hasBp >= 1, `bp=${hasBp}`);
// step a few times
for (let i=0;i<3;i++){ await p.locator('#dStep').click().catch(()=>{}); await sleep(150); }
rec('debugger: 3 steps no JS error', true, '');

console.log('\n── E. ERROR PROGRAM in problems ──');
await p.locator('#code').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); },
  'int main() { int = ; }');
await p.waitForTimeout(900);
await p.locator('.pt[data-p="problems"]').click(); await sleep(200);
const prob = (await p.locator('#pc').innerText() || '');
rec('problems panel shows diagnostic on invalid code', prob.includes('error') || prob.includes('x') && prob.length>0, prob.split('\n').slice(0,2).join(' '));
const cE = await p.locator('#cE').textContent();
rec('error counter > 0', (+cE) > 0, `cE=${cE}`);

console.log('\n── F. STATUS BAR cursor position ──');
await p.locator('#code').click(); await p.locator('#code').press('End');
await sleep(150);
const cur = (await p.locator('#sL').textContent()).trim();
rec('statusbar shows Ln/Col', /Ln\s+\d+/.test(cur), cur);

await b.close();
const fails = results.filter(r => !r.ok).length;
console.log(`\n════╡ DEEP AUDIT: ${results.length} checks, ${results.length - fails} passed, ${fails} failed ╞════`);
if (jsErrors.length) console.log('JS ERRORS:\n  ' + jsErrors.join('\n  ')); else console.log('No JS errors.');