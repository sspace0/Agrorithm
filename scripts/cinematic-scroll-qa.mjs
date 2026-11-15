import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.CINEMATIC_SCROLL_URL || "http://127.0.0.1:5189/Agrorithm/";
const browser = await chromium.launch({ headless: true });
const checks = [];
const check = (name, passed, detail) => {
  checks.push({ name, passed: !!passed, detail });
  assert.ok(passed, name);
};
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.route("**/__cinematic-scroll-qa", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><html><body></body></html>",
  }));
  await page.goto(`${base}__cinematic-scroll-qa`);
  // Use the production controller in a normal document without unrelated app motion.
  await page.evaluate(async (base) => {
    const { installCinematicScroll } = await import(`${base}src/motion/cinematicScroll.ts`);
    document.body.innerHTML = '<div id="normal" style="height:6000px;padding:20px"><div id="map" style="height:150px;background:#ddd">Map native wheel</div><div id="nested" style="height:100px;overflow:auto"><div style="height:1000px">Nested scrolling</div></div><input id="input"/><div id="editable" contenteditable="true">Text</div></div>';
    window.__disposeCinematic = installCinematicScroll();
    window.addEventListener("wheel", (event) => { window.__lastWheelPrevented = event.defaultPrevented; });
    window.__frames = 0;
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = function (callback) { window.__frames++; return original.call(this, callback); };
    document.querySelector("#map").addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
  }, base);
  const wheel = async (selector, options = {}) => page.locator(selector).evaluate((element, options) => {
    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 500, ...options });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }, options);
  await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
  await page.waitForTimeout(30);
  await page.mouse.move(600, 500);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(900);
  check("Actual page wheel is intercepted", await page.evaluate(() => window.__lastWheelPrevented));
  const slowed = await page.evaluate(() => scrollY);
  check("500px wheel settles at exactly 125px page travel", Math.abs(slowed - 625) <= 1, slowed);
  const frameCount = await page.evaluate(() => window.__frames);
  await page.waitForTimeout(150);
  check("No animation frames remain while idle", await page.evaluate(() => window.__frames) === frameCount, frameCount);
  const fineStart = await page.evaluate(() => scrollY);
  for (let i = 0; i < 20; i++) {
    await wheel("#normal", { deltaY: 0.8 });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(100);
  const fineEnd = await page.evaluate(() => scrollY);
  check("Small trackpad ticks retain their fractional travel", Math.abs(fineEnd - fineStart - 4) <= 1,
    { fineStart, fineEnd });
  for (const [name, selector, options] of [
    ["Map native preventDefault wins", "#map", {}],
    ["Nested scroll container stays native", "#nested", {}],
    ["Input stays native", "#input", {}],
    ["Editable stays native", "#editable", {}],
    ["Ctrl wheel stays native", "#normal", { ctrlKey: true }],
    ["Meta wheel stays native", "#normal", { metaKey: true }],
    ["Horizontal gesture stays native", "#normal", { deltaX: 700 }],
  ]) {
    const before = await page.evaluate(() => scrollY);
    const prevented = await wheel(selector, options);
    await page.waitForTimeout(30);
    check(name, await page.evaluate(() => scrollY) === before && (selector === "#map" || !prevented));
  }
  for (const interruption of ["pointerdown", "keydown", "hashchange", "external-scroll"]) {
    await wheel("#normal");
    await page.waitForTimeout(50);
    const stopped = await page.evaluate((interruption) => {
      if (interruption === "hashchange") return new Promise((resolve) => {
        window.addEventListener("hashchange", () => resolve(scrollY), { once: true });
        location.hash = `qa-${Date.now()}`;
      });
      if (interruption === "external-scroll") scrollTo({ top: 1500, behavior: "instant" });
      else window.dispatchEvent(new Event(interruption));
      return scrollY;
    }, interruption);
    await page.waitForTimeout(300);
    check(`${interruption} cancels pending wheel travel`, Math.abs(await page.evaluate(() => scrollY) - stopped) <= 1);
  }
  await page.evaluate(() => window.__disposeCinematic());
  check("Cleanup restores native CSS and listeners", await page.evaluate(() => !document.documentElement.hasAttribute("data-cinematic-scroll")) && !await wheel("#normal"));
  // Mount the real React hook to verify reduced-motion activation and cleanup.
  await page.evaluate(async (base) => {
    const { default: React } = await import(`${base}node_modules/.vite/deps/react.js`);
    const { default: ReactDOM } = await import(`${base}node_modules/.vite/deps/react-dom_client.js`);
    const { useCinematicScroll } = await import(`${base}src/motion/useCinematicScroll.ts`);
    window.__hookRoot = ReactDOM.createRoot(document.createElement("div"));
    function Harness() { useCinematicScroll(true); return null; }
    window.__hookRoot.render(React.createElement(Harness));
  }, base);
  await page.waitForTimeout(50);
  check("Hook enables cinematic CSS when motion is allowed", await page.evaluate(() => document.documentElement.hasAttribute("data-cinematic-scroll")));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  check("Reduced motion restores native wheel handling", !await wheel("#normal") && await page.evaluate(() => !document.documentElement.hasAttribute("data-cinematic-scroll")));
  const nativeStart = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(350);
  const nativeEnd = await page.evaluate(() => scrollY);
  check("Actual reduced-motion wheel keeps full native travel", Math.abs(nativeEnd - nativeStart - 500) <= 2,
    { nativeStart, nativeEnd });
  console.log(JSON.stringify({ checks: checks.length, failures: checks.filter((check) => !check.passed) }));
} finally {
  await browser.close();
  fs.mkdirSync("docs/design/agrorithm/cinematic-scroll-qa", { recursive: true });
  fs.writeFileSync("docs/design/agrorithm/cinematic-scroll-qa/results.json", JSON.stringify({ base, checks }, null, 2));
}
