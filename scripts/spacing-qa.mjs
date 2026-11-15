import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = process.env.VISUAL_QA_URL || "http://127.0.0.1:4173/FieldShift/";
const out = path.resolve("docs/design/agrorithm/spacing");
const filter = process.argv.find(a => a.startsWith("--filter="))?.slice(9);
const chosen = filter ? new RegExp(filter) : null;
const routes = [["home", "/"], ["atlas", "/atlas"], ["soil", "/soil"], ["crops", "/crops?crop=maize"], ["setup", "/studio/setup"], ["scenarios", "/studio/scenarios"], ["export", "/studio/export"]];
const records = [], failures = [];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const startedAt = new Date().toISOString();
const save = () => fs.writeFileSync(path.join(out, chosen ? "spacing-targeted.json" : "spacing-final.json"), JSON.stringify({ startedAt, updatedAt: new Date().toISOString(), browser: browser.version(), base, records, failures }, null, 2));
const check = (r, ok, name, detail) => { r.checks.push({ name, passed: !!ok, detail }); if (!ok) failures.push({ viewport: r.viewport, page: r.id, name, detail }); };
async function shot(page, r, suffix) { const file = `${r.viewport}-${r.id}-${suffix}.jpg`; await page.screenshot({ path: path.join(out, file), type: "jpeg", quality: 86, animations: "disabled" }); r.screenshots.push(file); }

async function controls(page) {
  return page.locator(".site-header").evaluate(header => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = rgb => rgb.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((v, n, i) => v + n * [.2126, .7152, .0722][i], 0);
    const contrast = el => { let parent = el, background; while (parent) { const c = rgb(getComputedStyle(parent).backgroundColor); if (c.length && (c[3] ?? 1) > .99) { background = c; break; } parent = parent.parentElement; } const a = lum(rgb(getComputedStyle(el).color)), b = lum(background || [255, 255, 255]); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const quality = header.querySelector(".quality-control"), q = rect(quality), icon = rect(quality.querySelector("svg")), caret = rect(quality.querySelector(".quality-chevron"));
    const motion = header.querySelector(".global-controls button"), label = motion.querySelector("span"), trigger = header.querySelector(".mobile-settings-trigger"), popover = header.querySelector(".display-controls");
    return { quality: q, centers: [icon.y + icon.height / 2 - q.y, caret.y + caret.height / 2 - q.y], motionLabel: { width: label.getBoundingClientRect().width, display: getComputedStyle(label).display }, contrast: { motion: contrast(motion), quality: contrast(quality.querySelector("select")), trigger: contrast(trigger) }, popover: rect(popover), documentOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}

async function sequence(page) {
  return page.locator(".sequence-row").evaluateAll(rows => rows.map(row => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const label = row.querySelector(".check-label"), input = label.querySelector("input"), button = row.querySelector("button"), bounds = rect(label), remove = rect(button);
    const text = [...label.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).map(n => { const range = document.createRange(); range.selectNodeContents(n); return rect(range); });
    return { dates: [...row.querySelectorAll('input[type="date"]')].map(rect), checkbox: rect(input), label: bounds, text, remove, overlap: Math.max(0, Math.min(bounds.right, remove.right) - Math.max(bounds.x, remove.x)) * Math.max(0, Math.min(bounds.bottom, remove.bottom) - Math.max(bounds.y, remove.y)) };
  }));
}

try {
  for (const [viewport, width, height] of [["desktop", 1440, 1000], ["tablet", 768, 1024], ["phone", 390, 844], ["wide", 1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block", isMobile: viewport === "phone", hasTouch: viewport !== "desktop" });
    for (const [id, route] of routes) {
      if (viewport === "wide" && id !== "home") continue;
      if (chosen && !chosen.test(`${viewport}/${id}`)) continue;
      const page = await context.newPage(), r = { viewport, id, route, checks: [], screenshots: [], errors: [] };
      page.on("pageerror", e => r.errors.push(e.message));
      try {
        await page.goto(`${base}#${route}`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(450); await shot(page, r, "top");
        check(r, !(await controls(page)).documentOverflow, "No horizontal document overflow", width);
        if (viewport === "wide") {
          const fullWidth = await page.locator(".site-header").evaluate(el => { const b = el.getBoundingClientRect(); return { left: b.left, width: b.width, height: b.height, availableWidth: document.documentElement.clientWidth }; });
          check(r, Math.abs(fullWidth.left) < 1 && Math.abs(fullWidth.width - fullWidth.availableWidth) < 1 && fullWidth.height === 106, "Wide header fills the available viewport at 106px height", fullWidth);
        }
        if (["home", "setup"].includes(id)) {
          const settings = page.getByRole("button", { name: "Display settings", exact: true }), hasPopover = await settings.isVisible();
          if (hasPopover) { await settings.click(); await page.waitForTimeout(150); await shot(page, r, "settings-open"); }
          const state = await controls(page); r.header = state;
          check(r, Math.abs(state.quality.height - 44) <= 1 && state.centers.every(c => Math.abs(c - state.quality.height / 2) <= 1), "Quality pill is 44px and icon/caret are vertically centered", state);
          check(r, state.quality.x >= 0 && state.quality.x + state.quality.width <= width, "Quality pill stays in the viewport", state.quality);
          check(r, state.contrast.motion >= 4.5 && state.contrast.quality >= 4.5, "Display control labels have 4.5:1 text contrast", state.contrast);
          if (hasPopover) {
            check(r, state.motionLabel.display !== "none" && state.motionLabel.width > 20, "Popover shows its motion label", state.motionLabel);
            check(r, state.contrast.trigger >= 3 && state.popover.x >= 0 && state.popover.x + state.popover.width <= width, "Settings trigger is visible and popover fits the viewport", state);
          }
          await page.getByRole("combobox", { name: "Graphics quality", exact: true }).selectOption("static"); await shot(page, r, "quality-poster"); await page.getByRole("combobox", { name: "Graphics quality", exact: true }).selectOption("auto");
          if (hasPopover) await settings.click();
        }
        await page.evaluate(id => {
          if (id === "soil" || id === "crops") { const s = document.querySelector(".crop-model-journey") || document.querySelector(".soil-scene-journey"), r = s.getBoundingClientRect(); scrollTo({ top: r.top + scrollY - innerHeight * .22 + .5 * (r.height - innerHeight * .65), behavior: "instant" }); }
          else if (id === "setup") document.querySelector(".sequence-editor").scrollIntoView({ block: "center", behavior: "instant" });
          else if (id === "atlas") document.querySelector(".world-map").scrollIntoView({ block: "center", behavior: "instant" });
          else scrollTo({ top: Math.min(innerHeight * .8, document.documentElement.scrollHeight - innerHeight), behavior: "instant" });
        }, id);
        await page.waitForTimeout(500);
        if (["soil", "crops"].includes(id)) { const stage = page.locator("[data-model-stage]").first(), play = stage.getByRole("button", { name: "Explore in 3D", exact: true }); if (viewport === "phone" && await play.isVisible()) await play.click(); await page.waitForFunction(() => !!document.querySelector("[data-model-stage]")?.dataset.bounds, undefined, { timeout: 15000 }); await page.waitForTimeout(200); }
        await shot(page, r, "mid");
        if (id === "setup") { const rows = await sequence(page); r.rows = rows; check(r, rows.every(row => row.dates.every(d => d.width >= 140)), "Every sequence date has at least 140px of readable width", rows); check(r, rows.every(row => row.checkbox.width === 18 && row.label.height >= 44 && row.text.every(t => t.x >= row.label.x - 1 && t.right <= row.label.right + 1) && row.overlap < 1 && row.remove.width >= 44 && row.remove.height >= 44), "Residue label and separate delete target fit their cells", rows); }
        if (id === "atlas") { const sizes = await page.locator(".map-zoom button,.map-presets button").evaluateAll(xs => xs.map(x => ({ width: x.getBoundingClientRect().width, height: x.getBoundingClientRect().height }))); check(r, sizes.length > 0 && sizes.every(s => s.width >= 44 && s.height >= 44), "Map zoom and context targets are at least 44px", sizes); }
        check(r, !(await controls(page)).documentOverflow, "Mid-page layout has no horizontal overflow", width);
        check(r, r.errors.length === 0, "No unhandled page errors", r.errors);
      } catch (error) { check(r, false, "Spacing case completes", String(error).slice(0, 1000)); try { await shot(page, r, "failure"); } catch { /* Closed browser cannot capture evidence. */ } }
      records.push(r); save(); console.log(`${viewport}/${id}: ${r.checks.filter(c => !c.passed).length} failing checks`); await page.close();
    }
    await context.close();
  }
} finally { save(); await browser.close(); }
console.log(`Spacing QA: ${records.length} cases, ${failures.length} failures.`);
if (failures.length) process.exitCode = 1;
