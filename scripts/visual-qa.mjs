import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = process.env.VISUAL_QA_URL || "http://127.0.0.1:4173/Agrorithm/";
const filterArg = process.argv.find(a => a.startsWith("--filter="));
const filter = filterArg ? new RegExp(filterArg.slice(9)) : null;
const output = path.resolve("docs/design/agrorithm");
fs.mkdirSync(output, { recursive: true });
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
];
const cases = [
  { id: "home", route: "/" },
  ...["setup", "evidence", "lab", "scenarios", "tradeoffs", "export"].map(step => ({ id: `studio-${step}`, route: `/studio/${step}` })),
  { id: "console", route: "/console/lab" }, { id: "companion", route: "/companion/setup" },
  { id: "atlas", route: "/atlas" },
  ...[["grains", "maize"], ["pulses", "mung"], ["vegetables", "tomato"], ["fruit", "citrus"]].map(([id, crop]) => ({ id: `crops-${id}`, route: `/crops?crop=${crop}`, model: true })),
  { id: "soil-root", route: "/soil", model: true }, { id: "soil-groundwater", route: "/soil", model: true, groundwater: true },
  ...["sources", "help", "about", "design"].map(id => ({ id, route: `/${id}` })),
];
const results = [], failures = [], startedAt = new Date().toISOString();
const browser = await chromium.launch({ headless: true });
const reportFile = path.join(output, filter ? "visual-qa-targeted.json" : "visual-qa.json");
const save = () => fs.writeFileSync(reportFile, JSON.stringify({ startedAt, updatedAt: new Date().toISOString(), base, browser: browser.version(), filteredRun: filter?.source ?? null, note: "Sequential headless Chromium checks, not physical mobile/GPU FPS measurements. Service workers are blocked to avoid a stale production build.", cases: results, failures }, null, 2));
const check = (record, condition, name, detail) => { record.checks.push({ name, passed: !!condition, detail }); if (!condition) failures.push({ case: record.id, viewport: record.viewport, name, detail }); };
const shot = async (page, record, suffix) => { const name = `${record.viewport}-${record.id}-${suffix}.jpg`; await page.screenshot({ path: path.join(output, name), type: "jpeg", quality: 82, animations: "disabled" }); record.screenshots.push(name); };

async function frameState(stage) {
  return stage.evaluate(el => {
    const host = el.getBoundingClientRect(), bounds = el.dataset.bounds ? JSON.parse(el.dataset.bounds) : null;
    const visible = [...el.querySelectorAll("[data-annotation]")].filter(a => getComputedStyle(a).visibility === "visible" && getComputedStyle(a).display !== "none");
    const annotations = visible.map(a => { const r = a.getBoundingClientRect(); return { id: a.dataset.annotation, x: r.left - host.left, y: r.top - host.top, width: r.width, height: r.height }; });
    const overlap = [];
    annotations.forEach((a, i) => annotations.slice(i + 1).forEach(b => { const area = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)); if (area > 1) overlap.push({ a: a.id, b: b.id, area }); }));
    const canvas = el.querySelector("canvas"); let renderer = null;
    if (canvas) { const gl = canvas.getContext("webgl2"); const ext = gl?.getExtension("WEBGL_debug_renderer_info"); renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "WebGL renderer not exposed"; }
    const externalControls = [...(el.closest(".soil-exhibit")?.querySelectorAll(".scene-toolbar,.scene-options") || [])].map(control => { const r = control.getBoundingClientRect(); return { name: control.className, overlap: Math.max(0, Math.min(host.right, r.right) - Math.max(host.left, r.left)) * Math.max(0, Math.min(host.bottom, r.bottom) - Math.max(host.top, r.top)) }; }).filter(control => control.overlap > 1);
    const labelBackgrounds = visible.map(a => ({ id: a.dataset.annotation, background: getComputedStyle(a).backgroundColor }));
    const toolbarElement = el.querySelector(".model-toolbar"), toolbarRect = toolbarElement?.getBoundingClientRect();
    const toolbar = toolbarRect ? { x: toolbarRect.left - host.left, y: toolbarRect.top - host.top, width: toolbarRect.width, height: toolbarRect.height } : null;
    const visibleHeight = Math.max(0, Math.min(innerHeight, host.bottom) - Math.max(0, host.top));
    return { bounds, host: { width: host.width, height: host.height, top: host.top, visibleFraction: visibleHeight / host.height }, clearAlpha: el.dataset.clearAlpha, mode: el.dataset.cameraMode, annotations, annotationOverlap: overlap, labelBackgrounds, externalControls, toolbar, renderer, canvasPixels: canvas ? [canvas.width, canvas.height] : null };
  });
}
async function ready(stage) {
  await stage.locator("canvas").waitFor({ timeout: 15000 });
  await stage.page().waitForFunction(el => !!el.dataset.bounds && !el.querySelector(".model-loading"), await stage.elementHandle(), { timeout: 15000 });
  await stage.page().waitForTimeout(650);
}
async function waitForPoster(stage) {
  await stage.locator(".model-fallback").waitFor({ timeout: 12000 });
  // The fallback fades in; inspect its settled state rather than sampling mid-transition.
  await stage.page().waitForFunction(el => getComputedStyle(el).opacity === "1", await stage.locator(".model-poster").elementHandle(), { timeout: 3000 });
}
async function progress(page, fraction) {
  await page.evaluate(p => {
    const story = document.querySelector(".crop-model-journey") || document.querySelector(".soil-scene-journey");
    const r = story.getBoundingClientRect(), top = r.top + scrollY;
    scrollTo({ top: Math.max(0, top - innerHeight * .22 + p * (r.height - innerHeight * .65)), behavior: "instant" });
  }, fraction);
  await page.waitForTimeout(700);
}
function assertFrame(record, state, label) {
  const b = state.bounds;
  check(record, !!b, `${label}: projected bounds recorded`, b);
  if (b) check(record, b.left >= -2 && b.top >= -2 && b.left + b.width <= b.viewportWidth + 2 && b.top + b.height <= b.viewportHeight + 2, `${label}: guided model fits canvas`, b);
  check(record, state.clearAlpha === "0", `${label}: transparent renderer clear`, state.clearAlpha);
  check(record, state.annotations.every(a => a.x >= -1 && a.y >= -1 && a.x + a.width <= state.host.width + 1 && a.y + a.height <= state.host.height + 1), `${label}: annotations inside stage`, state.annotations);
  check(record, state.annotationOverlap.length === 0, `${label}: annotations do not overlap each other`, state.annotationOverlap);
  check(record, state.labelBackgrounds.every(a => a.background !== "rgba(0, 0, 0, 0)" && a.background !== "transparent"), `${label}: visible labels have a background`, state.labelBackgrounds);
  check(record, state.externalControls.length === 0, `${label}: external controls do not cover the model`, state.externalControls);
  if (label === "Progress 0.5") check(record, state.host.visibleFraction >= .7, `${label}: model remains visible during its scroll journey`, state.host);
}
async function inspectControls(page, stage, record, viewport) {
  await stage.getByRole("button", { name: "Inspect model", exact: true }).click();
  await page.waitForTimeout(150);
  check(record, (await stage.getAttribute("data-camera-mode")) === "manual", "Inspect pauses the guided camera", await stage.getAttribute("data-camera-mode"));
  const before = await frameState(stage);
  await stage.getByRole("button", { name: "Zoom model in", exact: true }).click(); await page.waitForTimeout(350);
  const zoomed = await frameState(stage);
  check(record, zoomed.bounds?.height > before.bounds?.height * 1.05, "Zoom-in control changes the camera", { before: before.bounds, after: zoomed.bounds });
  await stage.getByRole("button", { name: "Reset model view", exact: true }).click(); await page.waitForTimeout(500);
  check(record, (await stage.getAttribute("data-camera-mode")) === "scroll", "Reset returns to guided camera", await stage.getAttribute("data-camera-mode"));
  if (viewport === "desktop") {
    const box = await stage.boundingBox(); await page.mouse.move(box.x + box.width / 2, Math.max(200, box.y + box.height / 2));
    const y0 = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 180); await page.waitForTimeout(350);
    check(record, (await page.evaluate(() => scrollY)) > y0 + 15, "Ordinary wheel over model scrolls the document", { before: y0, after: await page.evaluate(() => scrollY) });
    await page.keyboard.down("Control"); await page.mouse.wheel(0, -140); await page.keyboard.up("Control"); await page.waitForTimeout(300);
    check(record, (await stage.getAttribute("data-camera-mode")) === "manual", "Ctrl+wheel enters manual zoom", await stage.getAttribute("data-camera-mode"));
    await stage.getByRole("button", { name: "Reset model view", exact: true }).click();
  }
  await shot(page, record, "controls-reset");
  if (record.id === "crops-grains") {
    const lost = await stage.locator("canvas").evaluate(canvas => { const gl = canvas.getContext("webgl2"), extension = gl?.getExtension("WEBGL_lose_context"); extension?.loseContext(); return !!extension; });
    if (lost) { await waitForPoster(stage); check(record, await stage.locator(".model-poster").evaluate(el => getComputedStyle(el).opacity === "1"), "Context loss restores the poster", true); await shot(page, record, "context-loss-fallback"); }
    else check(record, false, "Context-loss extension available for verification", "Extension was unavailable; context-loss result is unverified");
  }
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, isMobile: viewport.name === "phone", hasTouch: viewport.name !== "desktop", serviceWorkers: "block" });
    for (const item of cases) {
      if (filter && !filter.test(`${viewport.name}/${item.id}`)) continue;
      const page = await context.newPage(), record = { id: item.id, route: item.route, viewport: viewport.name, size: [viewport.width, viewport.height], checks: [], screenshots: [], errors: [], failedResponses: [], frames: [] };
      page.on("pageerror", e => record.errors.push(e.message)); page.on("response", r => { if (r.status() >= 400) record.failedResponses.push({ status: r.status(), url: r.url() }); });
      try {
        await page.goto(`${base}#${item.route}`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(450);
        if (item.groundwater) await page.getByRole("button", { name: "Groundwater", exact: true }).click();
        const state = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, title: document.title, lang: document.documentElement.lang, dir: document.documentElement.dir, font: getComputedStyle(document.querySelector("main") || document.body).fontFamily, missingVisibleImages: [...document.images].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && getComputedStyle(i).display !== "none" && i.complete && i.naturalWidth === 0; }).map(i => i.src) }));
        record.layout = state;
        const metricFonts = await page.locator(".metric strong,.evidence-strip strong").evaluateAll(elements => elements.map(el => ({ value: el.textContent, family: getComputedStyle(el).fontFamily, style: getComputedStyle(el).fontStyle })));
        record.metricFonts = metricFonts;
        if (metricFonts.length) check(record, metricFonts.every(font => font.family.includes("Century Gothic") && font.style === "normal"), "Non-italic metric values use the shared UI font", metricFonts);
        check(record, !state.overflow, "No horizontal document overflow", state.overflow); check(record, state.lang === "en" && state.dir === "ltr", "English LTR document", { lang: state.lang, dir: state.dir }); check(record, !state.missingVisibleImages.length, "Visible images load", state.missingVisibleImages);
        await shot(page, record, "route");
        if (item.id === "atlas") { const jump = page.getByRole("link", { name: /View map/i }); if (await jump.count()) await jump.first().click(); else await page.locator(".world-map").scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await shot(page, record, "map"); }
        if (item.model) {
          await progress(page, .08); const stage = page.locator("[data-model-stage]").first();
          if (viewport.name === "phone") { check(record, await stage.locator("canvas").count() === 0, "Mobile poster before 3D opt-in", await stage.locator("canvas").count()); await shot(page, record, "poster-first"); await stage.getByRole("button", { name: "Explore in 3D", exact: true }).click(); }
          await ready(stage);
          for (const fraction of [.08, .5, .95]) { await progress(page, fraction); const frame = await frameState(stage); record.frames.push({ progress: fraction, ...frame }); assertFrame(record, frame, `Progress ${fraction}`); await shot(page, record, `model-${Math.round(fraction * 100)}`); }
          await progress(page, .5); await inspectControls(page, stage, record, viewport.name);
        }
        check(record, record.errors.length === 0, "No unhandled page errors", record.errors);
        check(record, record.failedResponses.length === 0, "No failed production asset responses", record.failedResponses);
      } catch (error) { check(record, false, "Case completes", String(error).slice(0, 1200)); try { await shot(page, record, "failure"); } catch { /* A closed/crashed browser cannot provide a screenshot. */ } }
      results.push(record); save(); console.log(`${viewport.name}/${item.id}: ${record.checks.filter(c => !c.passed).length} failing checks`); await page.close();
    }
    await context.close();
  }
  // One explicit missing-asset test; its intercepted response is a synthetic test fixture.
  if (!filter || filter.test("desktop/missing-model-fixture")) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" }), page = await context.newPage();
    const record = { id: "missing-model-fixture", route: "/crops?crop=maize", viewport: "desktop", checks: [], screenshots: [], errors: [], failedResponses: [], frames: [] };
    await page.route("**/models/crops/maize.glb", route => route.abort("failed"));
    try { await page.goto(`${base}#/crops?crop=maize`); await progress(page, .08); const stage = page.locator("[data-model-stage]").first(); await waitForPoster(stage); check(record, await page.locator(".model-poster").evaluate(el => getComputedStyle(el).opacity === "1"), "Missing model restores a visible poster", true); check(record, await page.locator(".crop-profile").count() > 0 || await page.getByText("Maize reference", { exact: true }).count() > 0, "Crop reference survives missing 3D", true); await shot(page, record, "fallback"); } catch (error) { check(record, false, "Missing-asset fallback completes", String(error).slice(0, 1000)); }
    results.push(record); await context.close(); save();
  }
  if (filter?.test("reducedmotion/soil")) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", serviceWorkers: "block" }), page = await context.newPage();
    const record = { id: "soil-reduced-motion", route: "/soil", viewport: "desktop-reduced-motion", checks: [], screenshots: [], errors: [], failedResponses: [], frames: [] };
    page.on("pageerror", error => record.errors.push(error.message));
    try {
      await page.goto(`${base}#/soil`); const stage = page.locator("[data-model-stage]").first(); await stage.scrollIntoViewIfNeeded(); await ready(stage);
      const initial = await frameState(stage); record.frames.push({ state: "initial", ...initial });
      check(record, await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "Reduced-motion preference is active", true);
      await stage.getByRole("button", { name: "Inspect model", exact: true }).click(); await stage.getByRole("button", { name: "Zoom model in", exact: true }).click(); await page.waitForTimeout(250);
      const zoomed = await frameState(stage); record.frames.push({ state: "zoomed", ...zoomed });
      check(record, zoomed.bounds?.height > initial.bounds?.height * 1.05, "Demand-mode manual zoom updates geometry and metadata", { before: initial.bounds, after: zoomed.bounds });
      await stage.getByRole("button", { name: "Reset model view", exact: true }).click(); await page.waitForTimeout(200);
      const reset = await frameState(stage); await page.getByRole("button", { name: "Separate layers", exact: true }).click(); await stage.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      const exploded = await frameState(stage); record.frames.push({ state: "exploded", ...exploded });
      check(record, exploded.bounds && reset.bounds && (Math.abs(exploded.bounds.height - reset.bounds.height) > reset.bounds.height * .01 || Math.abs(exploded.bounds.width - reset.bounds.width) > reset.bounds.width * .01), "Demand-mode layer separation updates geometry and metadata", { before: reset.bounds, after: exploded.bounds });
      const b = exploded.bounds;
      check(record, b && b.left >= -2 && b.top >= -2 && b.left + b.width <= b.viewportWidth + 2 && b.top + b.height <= b.viewportHeight + 2, "Separated layers fit inside the canvas", b);
      check(record, b && exploded.toolbar && b.top + b.height <= exploded.toolbar.y - 8, "Separated layers retain 8px clearance above the camera toolbar", { bounds: b, toolbar: exploded.toolbar, clearance: exploded.toolbar ? exploded.toolbar.y - b.top - b.height : null });
      check(record, exploded.clearAlpha === "0" && exploded.annotations.every(a => a.x >= -1 && a.y >= -1 && a.x + a.width <= exploded.host.width + 1 && a.y + a.height <= exploded.host.height + 1), "Reduced-motion renderer and label bounds remain valid", exploded);
      check(record, record.errors.length === 0, "Reduced-motion inspector has no page errors", record.errors); await shot(page, record, "exploded");
    } catch (error) { check(record, false, "Reduced-motion case completes", String(error).slice(0, 1000)); }
    results.push(record); await context.close(); save();
  }
} finally { save(); await browser.close(); }
console.log(`Visual QA: ${results.length} cases, ${failures.length} failing checks. ${reportFile}`);
if (failures.length) process.exitCode = 1;
