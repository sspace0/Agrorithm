import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.ASSESSMENT_REVIEW_URL || 'http://127.0.0.1:5188/Agrorithm/';
const out = path.dirname(fileURLToPath(import.meta.url));
const results = { generated: new Date().toISOString(), base, checks: [], errors: [], failures: [] };
const browser = await chromium.launch();
const assertion = (condition, message) => { if (!condition) throw Error(message); };
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => { localStorage.setItem('fieldshift-quality', JSON.stringify('static')); window.print = () => {}; });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => results.errors.push({ width, error: error.message }));
    const navigate = async route => { await page.evaluate(hash => { location.hash = hash; }, route); await page.locator('.input-assessment').waitFor(); };
    const focus = async locator => {
      await locator.evaluate(element => element.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -128));
    };
    try {
      await page.goto(base + '#/studio/lab');
      await page.locator('.boot-overlay').waitFor({ state: 'hidden' });
      await page.locator('.input-assessment').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const assessment = page.locator('.input-assessment');
      await focus(page.locator('.assessment-intro'));
      await page.screenshot({ path: path.join(out, `assessment-${width}-water.png`) });
      const layout = await assessment.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const rows = [...element.querySelectorAll('.input-assessment-row')];
        const issues = [];
        for (const row of rows) {
          const outer = row.getBoundingClientRect();
          if (row.scrollWidth > row.clientWidth + 1) issues.push({ id: row.dataset.assessmentId, issue: 'row overflow', scrollWidth: row.scrollWidth, clientWidth: row.clientWidth });
          for (const child of row.querySelectorAll('h4, .assessment-status, dt, dd, .assessment-bases, summary')) {
            const inner = child.getBoundingClientRect();
            if (inner.left < outer.left - 1 || inner.right > outer.right + 1) issues.push({ id: row.dataset.assessmentId, issue: 'child out of frame', text: child.textContent.slice(0, 80) });
            if (Number.parseFloat(getComputedStyle(child).fontSize) < 12) issues.push({ id: row.dataset.assessmentId, issue: 'text below 12px', text: child.textContent.slice(0, 80) });
          }
        }
        return { viewport: innerWidth, assessmentWidth: rect.width, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, rowCount: rows.length, issues };
      });
      assertion(!layout.pageOverflow, 'Page overflows horizontally');
      assertion(layout.issues.length === 0, JSON.stringify(layout.issues));
      assertion(await page.locator('[data-assessment-id="water-baseline"] .assessment-status').innerText() === 'Within comparison', 'Normal sample water status differs');
      assertion((await page.locator('[data-assessment-id="ph-maize"] .assessment-bases').innerText()).includes('Assumed soil input'), 'Sample soil is not labeled assumed');
      await focus(page.locator('[data-assessment-id="ph-maize"]'));
      await page.screenshot({ path: path.join(out, `assessment-${width}-soil.png`) });
      await focus(page.locator('[data-assessment-id="temperature-maize-heat"]'));
      await page.screenshot({ path: path.join(out, `assessment-${width}-temperature.png`) });
      results.checks.push({ width, case: 'sample-layout-and-provenance', pass: true, detail: layout });

      await page.evaluate(() => { location.hash = '/studio/setup'; });
      await page.getByLabel('Delivered limit · mm / 36 months', { exact: true }).fill('100');
      await navigate('/studio/tradeoffs');
      const limited = page.locator('[data-assessment-id="water-baseline"]');
      await focus(limited);
      assertion(await limited.getAttribute('class') === 'input-assessment-row assessment-exceeds', 'Water-budget exceedance not red status');
      assertion((await limited.innerText()).includes('Budget exceeded'), 'Budget explanation missing');
      const colors = await limited.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, border: getComputedStyle(element).borderInlineStartColor }));
      await page.screenshot({ path: path.join(out, `assessment-${width}-water-constrained.png`) });
      results.checks.push({ width, case: 'known-water-limit-exceeded', pass: true, colors });

      await page.evaluate(() => { location.hash = '/studio/setup'; });
      await page.getByLabel('Delivered limit · mm / 36 months', { exact: true }).fill('');
      await page.getByLabel('Delivery efficiency · fraction', { exact: true }).fill('');
      await navigate('/studio/lab');
      const unknown = page.locator('[data-assessment-id="water-baseline"]');
      await focus(unknown);
      assertion((await unknown.getAttribute('class')).includes('assessment-unknown'), 'Missing water evidence is not unknown');
      assertion((await unknown.innerText()).includes('Not enough evidence'), 'Unknown explanation missing');
      assertion(await page.locator('.input-assessment .assessment-exceeds').count() === 0, 'Missing evidence got a red budget diagnosis');
      await page.screenshot({ path: path.join(out, `assessment-${width}-unknown.png`) });
      results.checks.push({ width, case: 'missing-water-and-efficiency-neutral', pass: true });
    } catch (error) {
      results.failures.push({ width, error: String(error) });
      await page.screenshot({ path: path.join(out, `assessment-${width}-failure.png`) }).catch(() => {});
    } finally {
      await context.close();
      fs.writeFileSync(path.join(out, 'assessment-results.json'), JSON.stringify(results, null, 2));
    }
  }
} finally { await browser.close(); }
if (results.errors.length || results.failures.length) process.exitCode = 1;
console.log(JSON.stringify(results, null, 2));
