import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const base = 'https://sspace0.github.io/Agrorithm/?revision=6';
const out = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await context.addInitScript(() => localStorage.setItem('fieldshift-quality', JSON.stringify('static')));
const page = await context.newPage(); page.setDefaultTimeout(12000);
const results = { base, checks: [], failures: [] };
const go = async route => { await page.goto(base + '#/' + route); await page.reload(); await page.locator('.boot-overlay').waitFor({ state: 'hidden' }); };
const button = name => page.getByRole('button', { name, exact: true });
const check = async (name, fn) => { try { results.checks.push({ name, detail: await fn() }); } catch (e) { results.failures.push({ name, error: String(e) }); } };
const assert = (v, s) => { if (!v) throw Error(s); };
await check('Phone settings open/close, motion toggle, search open/close/result', async () => {
  await go('help'); await button('Display settings').click(); assert(await button('Display settings').getAttribute('aria-expanded') === 'true', 'not open');
  const motion = page.locator('.global-controls button'); const label = await motion.innerText(); await motion.click(); assert(await motion.innerText() !== label, 'motion unchanged'); await motion.click();
  await page.getByRole('combobox', { name: 'Graphics quality' }).selectOption('static'); await button('Display settings').click(); assert(await button('Display settings').getAttribute('aria-expanded') === 'false', 'not closed');
  await button('Search pages and tools').click(); await button('Close search').click(); assert(!(await page.getByRole('dialog', { name: 'Search Agrorithm' }).isVisible()), 'search not closed');
  await button('Search pages and tools').click(); await page.getByRole('textbox', { name: 'Search pages, crops and questions' }).fill('weather');
  await page.getByRole('dialog').locator('a[href="#/weather-patterns"]').click(); assert(page.url().includes('weather-patterns'), 'search result route mismatch');
  return 'settings, motion and search route work at 390px';
});
await check('Field add/remove/demo sequence, area units and scenario reset', async () => {
  await go('studio/setup'); const rows = page.locator('.sequence-editor .sequence-row'); const initial = await rows.count();
  await button('+ Add crop').click(); assert(await rows.count() === initial + 1, 'crop not added');
  await button('Remove crop ' + (initial + 1)).click(); assert(await rows.count() === initial, 'crop not removed');
  await button('Use demonstration maize–wheat dates').click(); assert(await rows.count() > 0, 'demonstration empty');
  const units = page.getByRole('button', { name: /Use acres|Use hectares/ }); if (await units.count()) { const label = await units.innerText(); await units.click(); assert(await units.innerText() !== label, 'area unit unchanged'); }
  await go('studio/scenarios'); const slider = page.getByRole('slider', { name: 'Rainfall relative to history' }); await slider.fill('50'); await button('Reset stress test').click(); assert(await slider.inputValue() === '100', 'reset failed');
  await page.screenshot({ path: out + 'phone-controls.jpg', quality: 80 }); return { sequenceRows: await rows.count(), resetRain: await slider.inputValue() };
});
await check('Crop search result selection and no-result state', async () => {
  await go('crops'); const search = page.locator('.crop-search input'); await search.fill('mango'); await page.locator('.crop-search-results').getByRole('button', { name: 'Mango', exact: true }).click();
  assert(await button('Plan with mango').isVisible(), 'mango not selected'); assert(await search.inputValue() === '', 'search did not clear');
  await search.fill('quasar'); await page.getByText('No crop matches. Try a name from the eight references below.').waitFor();
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'phone overflow'); return 'search selects mango and handles missing crop';
});
await browser.close(); fs.writeFileSync(out + 'extra-results.json', JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
