import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.EVIDENCE_REVIEW_URL || 'http://127.0.0.1:5188/Agrorithm/';
const out = path.dirname(fileURLToPath(import.meta.url));
const result = { generated: new Date().toISOString(), base, cases: [], errors: [], failures: [] };
const assert = (value, message) => { if (!value) throw Error(message); };
const browser = await chromium.launch({ headless: true });
async function shotAt(page, locator, file) {
  await locator.evaluate(element => { const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 106; scrollTo({ top: scrollY + element.getBoundingClientRect().top - header - 15, behavior: 'instant' }); });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(out, file), animations: 'disabled' });
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('fieldshift-quality', JSON.stringify('static')));
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => result.errors.push({ width, message: error.message }));
    try {
      await page.goto(base + '#/sources');
      await page.locator('.boot-overlay').waitFor({ state: 'hidden' });
      const panel = page.locator('.nasa-scope-panel');
      await panel.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert(await panel.locator('[data-status="implemented"]').count() === 2, 'NASA integration count differs');
      assert(await panel.locator('[data-status="not-used"]').count() === 6, 'Absent integration list incomplete');
      await shotAt(page, panel, `evidence-scope-${width}-implemented.png`);
      await shotAt(page, panel.locator('.nasa-scope-unused'), `evidence-scope-${width}-unused.png`);
      await panel.locator('.nasa-scope-future summary').click();
      await shotAt(page, panel.locator('.nasa-scope-future'), `evidence-scope-${width}-future.png`);
      const layout = await panel.evaluate(element => {
        const panelBox = element.getBoundingClientRect();
        const issues = [];
        for (const target of element.querySelectorAll('article,.nasa-scope-future,.nasa-scope-fallback,.nasa-scope-basemap')) {
          const box = target.getBoundingClientRect();
          if (box.left < panelBox.left - 1 || box.right > panelBox.right + 1 || target.scrollWidth > target.clientWidth + 1) issues.push({ issue: 'out of frame', class: target.className });
          for (const text of target.querySelectorAll('p,strong,span,dt,dd,summary,h3,h4,a')) {
            if (Number.parseFloat(getComputedStyle(text).fontSize) < 12) issues.push({ issue: 'small text', text: text.textContent.slice(0, 60) });
          }
        }
        return { panelWidth: panelBox.width, viewport: innerWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, issues };
      });
      assert(!layout.pageOverflow && !layout.issues.length, JSON.stringify(layout));
      assert((await panel.locator('.nasa-scope-future').innerText()).includes('must not be relabeled as SMAP'), 'Future source restriction hidden');
      await shotAt(page, panel.locator('.nasa-scope-fallback'), `evidence-scope-${width}-fallback.png`);
      await panel.getByRole('link', { name: 'Open evidence and manual imports', exact: true }).click();
      await page.getByLabel('Weather view start', { exact: true }).waitFor();
      assert(page.url().includes('#/studio/evidence'), 'Manual import link failed');
      result.cases.push({ width, passed: true, layout });
    } catch (error) {
      result.failures.push({ width, error: String(error) });
      await page.screenshot({ path: path.join(out, `evidence-scope-${width}-failure.png`) });
    } finally { await context.close(); }
  }
} finally { await browser.close(); fs.writeFileSync(path.join(out, 'source-scope-results.json'), JSON.stringify(result, null, 2)); }
console.log(JSON.stringify(result, null, 2));
if (result.errors.length || result.failures.length) process.exitCode = 1;
