import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.EVIDENCE_REVIEW_URL || 'http://127.0.0.1:5188/Agrorithm/';
const out = path.dirname(fileURLToPath(import.meta.url));
const result = { generated: new Date().toISOString(), base, checks: [], pageErrors: [], failures: [] };
const assert = (value, message) => { if (!value) throw Error(message); };
const browser = await chromium.launch({ headless: true });
const save = () => fs.writeFileSync(path.join(out, 'evidence-results.json'), JSON.stringify(result, null, 2));
const settle = async page => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.waitForTimeout(180); };
const shot = async (page, width, name) => { await settle(page); return page.screenshot({ path: path.join(out, `evidence-${width}-${name}.png`), animations: 'disabled' }); };
const placeBelowHeader = async (page, locator) => { await locator.evaluate(element => { const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 106; scrollTo({ top: scrollY + element.getBoundingClientRect().top - header - 15, behavior: 'instant' }); }); await settle(page); };
async function frameCheck(panel) {
  return panel.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const issues = [];
    for (const article of element.querySelectorAll('.evidence-dataset,.evidence-origins > div,.soil-health-note')) {
      const outer = article.getBoundingClientRect();
      if (outer.left < rect.left - 1 || outer.right > rect.right + 1) issues.push({ type: 'article outside panel', class: article.className });
      if (article.scrollWidth > article.clientWidth + 1) issues.push({ type: 'article horizontal overflow', class: article.className });
      for (const child of article.querySelectorAll('p,h3,h4,strong,button,summary')) {
        const box = child.getBoundingClientRect();
        if (getComputedStyle(child).display === 'none' || !box.width || !box.height) continue;
        if (child.closest('details:not([open])') && child.tagName !== 'SUMMARY') continue;
        if (box.left < outer.left - 1 || box.right > outer.right + 1) issues.push({ type: 'text outside article', text: child.textContent.slice(0, 60) });
        if (Number.parseFloat(getComputedStyle(child).fontSize) < 12) issues.push({ type: 'font below 12px', text: child.textContent.slice(0, 60) });
        if (child.tagName === 'BUTTON' && box.height < 44) issues.push({ type: 'button below 44px', text: child.textContent.slice(0, 60) });
      }
    }
    const origins = [...element.querySelectorAll('.evidence-origins > div')].map(el => { const box = el.getBoundingClientRect(); return { x: box.x, y: box.y, w: box.width, h: box.height }; });
    for (let i = 0; i < origins.length; i++) for (let j = i + 1; j < origins.length; j++) {
      const a = origins[i], b = origins[j];
      if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) issues.push({ type: 'origin cards overlap', a: i, b: j });
    }
    return { width: rect.width, left: rect.left, right: rect.right, viewport: innerWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, originCount: origins.length, issues };
  });
}

try {
  for (const width of [1440, 390]) {
    for (const scenario of ['sample', 'missing-satellite', 'mismatched-location', 'imported-weather']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce', isMobile: width === 390, hasTouch: width === 390 });
      await context.addInitScript(() => localStorage.setItem('fieldshift-quality', JSON.stringify('static')));
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => result.pageErrors.push({ width, scenario, message: error.message }));
      if (scenario === 'missing-satellite') await page.route('**/data/vegetation.json', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated satellite outage for QA' }) }));
      try {
        await page.goto(base + '#/studio/lab');
        await page.locator('.boot-overlay').waitFor({ state: 'hidden' });
        await page.locator('.weather-data-strip').waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (scenario === 'mismatched-location' || scenario === 'imported-weather') {
          await page.evaluate(() => { location.hash = '/studio/setup'; });
          await page.getByLabel('Latitude (°)', { exact: true }).fill('30.2');
          await page.getByLabel('Longitude (°)', { exact: true }).fill('71.4');
          if (scenario === 'imported-weather') {
            await page.evaluate(() => { location.hash = '/studio/evidence'; });
            const weather = JSON.parse(fs.readFileSync(new URL('../../../../public/data/weather.json', import.meta.url), 'utf8')).days;
            await page.locator('.file-input').filter({ hasText: 'Import daily JSON' }).locator('input').setInputFiles({ name: 'qa-imported-weather.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(weather)) });
          }
          await page.evaluate(() => { location.hash = '/studio/lab'; });
          await page.locator('.weather-data-strip').waitFor();
        }
        const strip = page.locator('.weather-data-strip');
        await strip.scrollIntoViewIfNeeded();
        await shot(page, width, `${scenario}-strip`);
        const panel = page.locator('.nasa-evidence-panel');
        await panel.scrollIntoViewIfNeeded();
        const layout = await frameCheck(panel);
        assert(!layout.pageOverflow && layout.left >= 0 && layout.right <= width + 1, 'Evidence panel / page overflows viewport');
        assert(layout.issues.length === 0, JSON.stringify(layout.issues));
        assert(layout.originCount === 4, 'Four evidence-origin categories are not present');
        await placeBelowHeader(page, panel);
        await shot(page, width, `${scenario}-panel`);
        if (scenario === 'sample') {
          assert((await strip.innerText()).includes('2018-01-01 → 2024-12-31'), 'POWER record dates not visible in strip');
          assert((await strip.innerText()).includes('2023-01-05 → 2023-12-31'), 'HLS acquisition dates not visible in strip');
          assert((await panel.innerText()).includes('16 / 43 scenes'), 'HLS quality counts not visible');
          assert((await panel.innerText()).includes('does not automatically change rotation scores'), 'NDVI role limit missing');
          await placeBelowHeader(page, page.locator('.evidence-origins'));
          await shot(page, width, 'sample-origins');
          await placeBelowHeader(page, page.locator('.soil-health-note'));
          await shot(page, width, 'sample-soil-note');
          const obstruction = await page.evaluate(() => {
            const trigger = document.querySelector('.agr-helper-trigger')?.getBoundingClientRect();
            const footer = document.querySelector('.step-footer')?.getBoundingClientRect();
            const area = trigger && footer ? Math.max(0, Math.min(trigger.right, footer.right) - Math.max(trigger.left, footer.left)) * Math.max(0, Math.min(trigger.bottom, footer.bottom) - Math.max(trigger.top, footer.top)) : 0;
            return { trigger: trigger ? { top: trigger.top, bottom: trigger.bottom, left: trigger.left, right: trigger.right } : null, footer: footer ? { top: footer.top, bottom: footer.bottom } : null, overlapArea: area };
          });
          result.checks.push({ width, scenario: 'settled-helper-footer-clearance', passed: obstruction.overlapArea === 0, detail: obstruction });
          await page.locator('.soil-health-note summary').click();
          assert((await page.locator('.soil-health-note').innerText()).includes('not implemented here'), 'Future SMAP work incorrectly presented');
          const weatherMethod = panel.locator('.evidence-dataset').first().locator('summary');
          await weatherMethod.click();
          assert((await panel.innerText()).includes('does not predict yield'), 'Weather calculation limit is not accessible');
        } else {
          const unavailable = panel.locator('.evidence-unavailable');
          assert(await unavailable.isVisible(), 'Contrasting evidence warning is missing');
          const colors = await unavailable.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, border: getComputedStyle(element).borderInlineStartColor }));
          assert(colors.background === 'rgb(255, 240, 230)', `Warning lacks orange fallback background: ${colors.background}`);
          if (scenario === 'missing-satellite') {
            assert((await panel.innerText()).includes('No NDVI is invented'), 'Outage fallback missing');
            assert((await strip.innerText()).includes('No quality-passing scenes'), 'Outage not visible in results strip');
            await unavailable.scrollIntoViewIfNeeded();
            await shot(page, width, 'missing-satellite-fallback');
            await unavailable.getByRole('button', { name: 'Open data and manual import', exact: true }).click();
            assert(page.url().includes('#/studio/evidence'), 'Manual evidence fallback does not navigate');
          }
          if (scenario === 'mismatched-location') assert((await unavailable.innerText()).includes('Moving the marker does not move the observation'), 'Location mismatch is not explained');
          if (scenario === 'imported-weather') {
            const weatherPanel = panel.locator('[data-dataset="power"]');
            const text = await weatherPanel.innerText();
            assert(text.includes('source time standard unverified') && text.includes('No NASA product or grid is assumed'), 'Imported source metadata not separated');
            assert(!text.includes('POWER / MERRA-2') && !text.includes('Regional meteorology grid'), 'Imported rows mislabeled as NASA');
          }
          result.checks.push({ width, scenario, passed: true, layout, warningColors: colors });
        }
        if (scenario === 'sample') result.checks.push({ width, scenario, passed: true, layout });
      } catch (error) {
        result.failures.push({ width, scenario, error: String(error) });
        await shot(page, width, `${scenario}-failure`);
      } finally { await context.close(); save(); }
    }
  }
} finally { await browser.close(); save(); }
console.log(JSON.stringify(result, null, 2));
if (result.failures.length || result.pageErrors.length) process.exitCode = 1;
