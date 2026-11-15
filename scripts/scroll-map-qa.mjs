import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const base = process.env.VISUAL_QA_URL || "http://127.0.0.1:5201/Agrorithm/";
const out = path.resolve("docs/design/agrorithm/lusion-polish");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(),
  results = [];
const box = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
async function settle(page) {
  await page
    .locator(".boot-overlay")
    .waitFor({ state: "hidden", timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
}
async function check(page, name) {
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    width: innerWidth,
    header: document.querySelector(".site-header").getBoundingClientRect()
      .height,
  }));
  results.push({ name, ...layout });
  if (layout.overflow) throw Error(name + " overflows");
  await page.screenshot({ path: path.join(out, name + ".jpg"), quality: 87 });
}
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 768, 1024],
  ["phone", 390, 844],
]) {
  if (process.env.VISUAL_QA_FILTER && name !== process.env.VISUAL_QA_FILTER)
    continue;
  const context = await browser.newContext({
      viewport: { width, height },
      serviceWorkers: "block",
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await settle(page);
  for (const [phase, p] of [
    ["opening", 0],
    ["turn", 0.5],
    ["map", 0.98],
  ]) {
    await page.locator(".orbit-opening").evaluate((el, p) => {
      const r = el.getBoundingClientRect(),
        pin = el.firstElementChild.getBoundingClientRect();
      scrollTo(
        0,
        scrollY +
          r.top -
          (parseFloat(getComputedStyle(el.firstElementChild).top) || 0) +
          p * (r.height - pin.height),
      );
    }, p);
    await page.waitForTimeout(650);
    await check(page, name + "-" + phase);
  }
  await page.locator(".exhibition-prologue").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await check(page, name + "-editorial");
  if (name === "desktop") {
    const story = page.locator(".scroll-story");
    for (const [phase, p] of [
      ["soil-joined", 0.04],
      ["soil-open", 0.5],
      ["soil-rejoined", 0.95],
    ]) {
      await story.evaluate((el, p) => {
        const r = el.getBoundingClientRect();
        scrollTo(
          0,
          scrollY +
            r.top -
            innerHeight * 0.22 +
            p * (r.height - innerHeight * 0.65),
        );
      }, p);
      await page.waitForTimeout(1200);
      await check(page, name + "-" + phase);
    }
  }
  await page.goto(base + "#/atlas");
  await settle(page);
  await page.getByRole("application").scrollIntoViewIfNeeded();
  await check(page, name + "-atlas-world");
  const r = await page.getByRole("application").boundingBox();
  await page.getByRole("application").evaluate((el) => {
    window.atlasQaEvents = [];
    el.addEventListener("wheel", (e) =>
      window.atlasQaEvents.push({
        x: e.clientX,
        y: e.clientY,
        prevented: e.defaultPrevented,
        target: e.target.tagName,
        zoom: el.dataset.zoom,
      }),
    );
  });
  await page
    .getByRole("application")
    .hover({ position: { x: r.width * 0.65, y: r.height * 0.35 } });
  for (let i = 0; i < 12; i++) {
    const previous = Number(
      await page.getByRole("application").getAttribute("data-zoom"),
    );
    if (previous === 24) break;
    await page.mouse.wheel(0, -400);
    await page.waitForFunction(
      (z) =>
        Number(
          document.querySelector(".world-map")?.getAttribute("data-zoom"),
        ) > z,
      previous,
      { timeout: 3000 },
    );
  }
  await page.waitForTimeout(250);
  const zoom = Number(
    await page.getByRole("application").getAttribute("data-zoom"),
  );
  if (zoom !== 24) {
    const diagnostic = await page.evaluate(
      ({ x, y }) => ({
        events: window.atlasQaEvents,
        scroll: scrollY,
        target: document.elementFromPoint(x, y)?.outerHTML,
        view: document.querySelector(".world-map").outerHTML.slice(0, 400),
      }),
      { x: r.x + r.width * 0.65, y: r.y + r.height * 0.35 },
    );
    fs.writeFileSync(
      path.join(out, name + "-map-diagnostic.json"),
      JSON.stringify({ zoom, r, diagnostic }, null, 2),
    );
    await page.screenshot({
      path: path.join(out, name + "-map-diagnostic.jpg"),
    });
    await browser.close();
    throw Error("Map did not reach24x: " + zoom);
  }
  await check(page, name + "-atlas-zoom24");
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await page.goto(base + "#/studio/scenarios");
  await settle(page);
  await page.locator(".scenario-layout").scrollIntoViewIfNeeded();
  const columns = await page
    .locator(".scenario-layout")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  const children = await page
    .locator(".scenario-layout>section")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, width: r.width };
      }),
    );
  results.push({ name: name + "-scenario-layout", columns, children });
  await check(page, name + "-scenarios");
  if (errors.length) throw Error(errors.join(";"));
  await context.close();
}
const reduced = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
await reduced.goto(base);
await settle(reduced);
await check(reduced, "phone-reduced-motion");
results.push({
  name: "reduced-motion-static",
  height: await reduced
    .locator(".orbit-opening")
    .evaluate((e) => e.getBoundingClientRect().height),
  cursor: await reduced.locator(".orbit-cursor").count(),
});
await browser.close();
fs.writeFileSync(
  path.join(out, "results.json"),
  JSON.stringify({ date: new Date().toISOString(), base, results }, null, 2),
);
console.log(
  `${results.length} actual rendered layout checks and screenshots completed.`,
);
