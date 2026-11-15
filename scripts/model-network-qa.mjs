import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.MODEL_QA_URL || 'http://127.0.0.1:4173/Agrorithm/';
const out = path.resolve('docs/design/agrorithm/results-review/network');
fs.mkdirSync(out, { recursive: true });
const profile = { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' };
const results = { generated: new Date().toISOString(), base, profile, note: 'CDP network and viewport emulation, not physical-phone or FPS measurements. Fresh contexts, disabled HTTP cache and blocked service workers. Three successful-load cases run concurrently; each context has its own throttled connection.', cases: [] };
const browser = await chromium.launch({ headless: true });
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
async function run(id, width, groundwater = false, fail = false) {
  const record = { id, width, status: 'running', pageErrors: [], requests: [] };
  results.cases.push(record); save();
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390 });
  await context.addInitScript(staticMode => {
    localStorage.setItem('fieldshift-quality', JSON.stringify(staticMode ? 'static' : 'auto'));
    const marks = {}; window.__modelNetworkMarks = marks;
    const clock = () => performance.now();
    const interval = setInterval(() => {
      const boot = document.querySelector('.boot-overlay');
      const plan = document.querySelector('.top-links a[href*="/setup"]');
      if (plan && !marks.planUsableMs) { const r = plan.getBoundingClientRect(); if (r.width && r.height && plan.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))) marks.planUsableMs = clock(); }
      for (const presentation of document.querySelectorAll('.model-presentation')) {
        const name = presentation.dataset.modelUrl, stage = presentation.querySelector('[data-model-stage]'), img = presentation.querySelector('.model-poster');
        const own = marks[name] ||= {};
        if (img?.complete && img.naturalWidth) {
          own.posterDecodedMs ||= clock();
          const r = img.getBoundingClientRect();
          if (!boot && r.bottom > 0 && r.top < innerHeight && Number(getComputedStyle(img).opacity) > .5) own.firstVisiblePosterMs ||= clock();
        }
        if (stage?.dataset.bounds && !stage.querySelector('.model-loading') && stage.querySelector('canvas') && !stage.querySelector('.model-fallback')) own.renderReadyMs ||= clock();
      }
      if (clock() > 90000) clearInterval(interval);
    }, 50);
  }, groundwater);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); await cdp.send('Network.emulateNetworkConditions', profile);
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', e => { if (/\.glb(?:\?|$)/.test(e.request.url)) { const row = { url: e.request.url, requestTimestamp: e.timestamp }; requests.set(e.requestId, row); record.requests.push(row); } });
  cdp.on('Network.responseReceived', e => { const row = requests.get(e.requestId); if (row) Object.assign(row, { status: e.response.status, contentLength: e.response.headers['Content-Length'] || e.response.headers['content-length'] || null, fromDiskCache: e.response.fromDiskCache }); });
  cdp.on('Network.loadingFinished', e => { const row = requests.get(e.requestId); if (row) Object.assign(row, { encodedTransferBytes: e.encodedDataLength, downloadSeconds: +(e.timestamp - row.requestTimestamp).toFixed(2) }); });
  cdp.on('Network.loadingFailed', e => { const row = requests.get(e.requestId); if (row) row.failure = e.errorText; });
  page.on('pageerror', error => record.pageErrors.push(error.message));
  let failRoute, releaseFailure;
  const failureGate = new Promise(resolve => { releaseFailure = resolve; });
  if (fail) await page.route('**/root-zone-v2.glb', async route => { failRoute = route; await failureGate; await route.abort('failed'); });
  try {
    await page.goto(base + '#/soil', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('.boot-overlay').waitFor({ state: 'hidden', timeout: 15000 });
    if (groundwater) {
      await page.getByRole('button', { name: 'Groundwater', exact: true }).click();
      await page.getByLabel('Graphics quality', { exact: true }).selectOption('auto');
    }
    const model = groundwater ? 'groundwater' : 'root-zone';
    const presentation = page.locator(`.model-presentation[data-model-url="models/${model}-v2.glb"]`);
    const stage = presentation.locator('[data-model-stage]');
    await stage.scrollIntoViewIfNeeded();
    await presentation.locator('.model-poster').evaluate(img => img.decode());
    await page.waitForTimeout(150);
    record.beforeOptInGlbCount = record.requests.length;
    if (width === 390) {
      await page.screenshot({ path: path.join(out, `${id}-poster.png`) });
      if (record.requests.length) throw Error('Phone downloaded a GLB before explicit opt-in');
      record.optInAtMs = await page.evaluate(() => performance.now());
      await presentation.getByRole('button', { name: 'Explore in 3D', exact: true }).click();
    }
    await page.waitForFunction(() => !!document.querySelector('.model-loading'), { timeout: 12000 });
    await page.screenshot({ path: path.join(out, `${id}-loading.png`) });
    if (fail) {
      await page.waitForFunction(() => !!document.querySelector('canvas'), { timeout: 15000 });
      await page.locator('.top-links').getByRole('link', { name: 'Plan', exact: true }).click();
      const field = page.getByLabel('Field name', { exact: true }); await field.fill('Network QA example');
      record.planningUsableDuringDownload = await field.inputValue() === 'Network QA example' && !!failRoute;
      await page.locator('.top-links').getByRole('link', { name: '3D explorer', exact: true }).click();
      await page.locator('[data-model-stage]').scrollIntoViewIfNeeded();
      releaseFailure();
      await page.locator('.model-fallback').waitFor({ timeout: 15000 });
      record.fallbackVisible = await page.locator('.model-fallback').isVisible();
      record.posterRetained = await page.locator('.model-poster').evaluate(img => img.complete && img.naturalWidth > 0 && Number(getComputedStyle(img).opacity) > .5);
      await page.screenshot({ path: path.join(out, `${id}-fallback.png`) });
    } else {
      await page.waitForFunction(name => !!window.__modelNetworkMarks?.[name]?.renderReadyMs, `models/${model}-v2.glb`, { timeout: 75000 });
      await page.waitForTimeout(250);
      record.cameraControlsUsable = await presentation.getByRole('button', { name: 'Zoom model in', exact: true }).isEnabled();
      await page.screenshot({ path: path.join(out, `${id}-ready.png`) });
      record.geometry = await stage.evaluate(el => ({ bounds: JSON.parse(el.dataset.bounds), clearAlpha: el.dataset.clearAlpha, renderer: (() => { const gl = el.querySelector('canvas')?.getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'not exposed'; })() }));
    }
    record.marks = await page.evaluate(() => window.__modelNetworkMarks);
    const own = record.marks[`models/${model}-v2.glb`];
    if (own?.renderReadyMs && record.optInAtMs) record.readyAfterOptInSeconds = +((own.renderReadyMs - record.optInAtMs) / 1000).toFixed(2);
    record.status = 'passed';
  } catch (error) { record.status = 'partial'; record.error = String(error); await page.screenshot({ path: path.join(out, `${id}-partial.png`) }).catch(() => {}); }
  finally { releaseFailure(); await context.close(); save(); }
}
try {
  await Promise.all([run('phone-root', 390), run('desktop-root', 1440), run('desktop-groundwater', 1440, true)]);
  await run('failed-model-planning', 1440, false, true);
} finally { await browser.close(); save(); }
console.log(JSON.stringify(results, null, 2));
