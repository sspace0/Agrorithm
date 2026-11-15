import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.BUTTON_AUDIT_URL || 'https://sspace0.github.io/Agrorithm/?revision=6';
const out = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(out, { recursive: true });
const result = { generated: new Date().toISOString(), base, checks: [], failures: [], inventory: [], assets: [], errors: [] };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
await context.addInitScript(() => { localStorage.setItem('fieldshift-quality', JSON.stringify('static')); window.print = () => { window.__printCalls = (window.__printCalls || 0) + 1; }; });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', e => result.errors.push(e.message));
const check = async (name, fn) => { try { const detail = await fn(); result.checks.push({ name, pass: true, detail }); console.log('PASS', name); } catch (e) { result.failures.push({ name, error: String(e) }); console.log('FAIL', name, String(e).slice(0, 200)); } fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); };
const go = async route => { await page.goto(base + '#/' + route); await page.locator('.boot-overlay').waitFor({ state: 'hidden' }); };
const click = async name => page.getByRole('button', { name, exact: true }).click();
const download = async locator => { const [d] = await Promise.all([page.waitForEvent('download'), locator.click()]); const p = await d.path(); const text = fs.readFileSync(p, 'utf8'); return { name: d.suggestedFilename(), bytes: fs.statSync(p).size, text }; };
const expect = (value, message) => { if (!value) throw Error(message); };
try {
  for (const crop of ['wheat','maize','mung','chickpea','tomato','potato','citrus','mango']) await check('Plan with ' + crop, async () => {
    await go('crops?crop=' + crop); await click('Plan with ' + (crop === 'mung' ? 'mungbean' : crop));
    expect(await page.getByRole('combobox', { name: 'Crop to explore', exact: true }).inputValue() === crop, 'crop handoff mismatch');
    expect(page.url().includes('/studio/setup'), 'setup not reached'); return page.url();
  });
  for (const concept of ['studio','console','companion']) await check(concept + ' six navigation steps and sensitivity worker', async () => {
    await go(concept + '/setup'); await click('Load sample');
    const visited = [];
    for (const [route, name] of [['setup','Your field'],['lab','Rotation lab'],['evidence','The evidence'],['scenarios','What if?'],['tradeoffs','Trade-offs'],['export','Your plan']]) {
      await page.getByRole('link', { name: new RegExp(name.replace(/[?]/g, '\\?')) }).first().click();
      expect(page.url().includes('/' + concept + '/' + route), 'route mismatch ' + page.url()); visited.push(route);
      if (route === 'tradeoffs') { await click('Run six sensitivity scenarios'); await page.getByText('Feasible cases / 6', { exact: true }).waitFor(); }
    }
    return visited;
  });
  await check('Help suggestion, clear search, no-result recovery', async () => {
    await go('help'); const input = page.getByRole('searchbox', { name: 'Search the question guide' });
    await input.fill('quasars'); await page.getByRole('heading', { name: 'This guide cannot answer that yet.' }).waitFor();
    await click('Show all questions'); expect(await input.inputValue() === '', 'search not cleared');
    for (const topic of ['Water','Map','Soil','Rice','Weather','Offline']) { await click(topic); expect(await input.inputValue() === topic, 'topic did not fill'); }
    await click('All questions'); expect(await input.inputValue() === '', 'all questions did not clear');
    return { cleared: true, questions: await page.locator('main h2').count() };
  });
  await check('Weather: four patterns, all 84 monthly buttons, custom valid/invalid/close', async () => {
    await go('weather-patterns'); const patterns = page.locator('.weather-pattern-key button'); await patterns.first().waitFor();
    for (let i = 0; i < await patterns.count(); i++) { await patterns.nth(i).click(); expect(await patterns.nth(i).getAttribute('aria-pressed') === 'true', 'pattern not selected'); }
    const months = page.locator('.weather-calendar button'); const count = await months.count();
    for (let i = 0; i < count; i++) { await months.nth(i).click(); expect(await months.nth(i).getAttribute('aria-pressed') === 'true', 'month not selected'); }
    await page.getByRole('combobox', { name: 'Historical month' }).selectOption('2018-01');
    await click('Compare custom monthly conditions'); await page.getByLabel('Custom Monthly precipitation', { exact: true }).fill('-1');
    expect((await page.locator('.weather-custom-result').innerText()).includes('Comparison unresolved'), 'invalid comparison not rejected');
    await page.getByLabel('Custom Monthly precipitation', { exact: true }).fill('100');
    expect((await page.locator('.weather-custom-result').innerText()).includes('hypothetical input'), 'valid comparison unresolved');
    await page.screenshot({ path: path.join(out, 'weather-custom.jpg'), quality: 80 }); await click('Close custom comparison');
    await page.getByText('Model details, limitations and provenance', { exact: true }).click();
    const artifact = await download(page.getByRole('link', { name: 'Download model and observations' }));
    expect(JSON.parse(artifact.text).observations.length === 84, 'model artifact incomplete'); return { patterns: 4, months: count, download: { name: artifact.name, bytes: artifact.bytes } };
  });
  await check('Weather unavailable state and retry', async () => {
    let blocked = true; await page.route('**/data/weather-patterns.json', r => blocked ? r.fulfill({ status: 503, body: 'Unavailable' }) : r.continue());
    await go('weather-patterns'); await page.reload(); await page.locator('.boot-overlay').waitFor({ state: 'hidden' }); await page.getByRole('heading', { name: 'The learned record is unavailable.' }).waitFor();
    blocked = false; await click('Try again'); await page.locator('.weather-calendar button').first().waitFor(); await page.unroute('**/data/weather-patterns.json'); return '503 recovered through retry';
  });
  let packet;
  await check('JSON, CSV, feedback template downloads and print button', async () => {
    await go('studio/setup'); await click('Load sample'); await go('studio/export');
    const json = await download(page.getByRole('button', { name: /Complete JSON/ })); packet = json.text; expect(JSON.parse(packet).results.length === 3, 'missing JSON results');
    const csv = await download(page.getByRole('button', { name: /Portable CSV/ })); expect(csv.text.includes('provenance'), 'missing CSV provenance');
    const template = await download(page.getByRole('link', { name: 'Download blank farmer/agronomist feedback template' })); expect(template.bytes > 100, 'empty template');
    await page.getByRole('button', { name: /Presentation PDF/ }).click(); await page.waitForFunction(() => window.__printCalls > 0); await page.screenshot({ path: path.join(out, 'export.jpg'), quality: 80 });
    return { json: json.bytes, csv: csv.bytes, template: template.bytes, printCalls: await page.evaluate(() => window.__printCalls) };
  });
  await check('Save/delete/reset and exported-plan restore; malformed import error', async () => {
    await click('Save on this device'); expect(await page.evaluate(() => !!localStorage.getItem('fieldshift-plan')), 'not saved');
    await click('Delete saved plan'); expect(await page.evaluate(() => !localStorage.getItem('fieldshift-plan')), 'not deleted');
    await click('Reset all inputs');
    const input = page.getByLabel('Restore exported plan JSON');
    await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await page.getByRole('status').filter({ hasText: /SyntaxError/ }).waitFor();
    await input.setInputFiles({ name: 'restored.json', mimeType: 'application/json', buffer: Buffer.from(packet) });
    await page.getByRole('status').filter({ hasText: /Plan restored/ }).waitFor();
    return { save: true, delete: true, reset: true, invalidRejected: true, restored: true };
  });
  await check('Editable crop registry download/import/restore and malformed weather', async () => {
    await go('studio/evidence'); const table = await download(page.getByRole('button', { name: 'Download editable crop table', exact: true }));
    await page.getByLabel('Import crop registry JSON').setInputFiles({ name: 'crop-table.json', mimeType: 'application/json', buffer: Buffer.from(table.text) });
    await click('Restore bundled crop parameters'); expect(await page.getByRole('button', { name: 'Restore bundled crop parameters' }).count() === 0, 'registry did not reset');
    await page.getByLabel('Import daily JSON').setInputFiles({ name: 'bad-weather.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await page.getByRole('status').filter({ hasText: /SyntaxError/ }).waitFor(); return { registryBytes: table.bytes, import: true, restore: true, malformedWeatherRejected: true };
  });
  const hrefs = new Set();
  for (const route of ['', 'help','weather-patterns','crops','atlas','soil','sources','about','design','studio/setup','studio/lab','studio/evidence','studio/scenarios','studio/tradeoffs','studio/export']) await check('Inventory ' + (route || 'home'), async () => {
    await go(route);
    const inventory = await page.locator('main button, main a, main input, main select, header button, header a, header select').evaluateAll(els => els.filter(el => !el.closest('iframe')).map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140), href: el.getAttribute('href'), type: el.getAttribute('type'), width: Math.round(r.width), height: Math.round(r.height), visible: r.width > 0 && r.height > 0 }; }));
    for (const a of await page.locator('a[href]').evaluateAll(els => els.map(el => el.href))) if (a.startsWith('https://sspace0.github.io/Agrorithm/') && !a.includes('#')) hrefs.add(a);
    result.inventory.push({ route: route || 'home', controls: inventory, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) }); return inventory.length;
  });
  for (const href of hrefs) await check('Internal asset ' + href, async () => { const response = await context.request.get(href); const row = { href, status: response.status(), bytes: (await response.body()).length }; result.assets.push(row); expect(response.ok(), 'bad asset status ' + response.status()); return row; });
} finally { await browser.close(); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify({ passed: result.checks.length, failed: result.failures.length, errors: result.errors.length })); }
