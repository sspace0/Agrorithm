import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.MODEL_CONTROLS_URL || "http://127.0.0.1:4173/Agrorithm/";
const out = path.resolve("docs/design/agrorithm/model-controls-qa");
const filter = process.argv.find((argument) => argument.startsWith("--filter="))?.slice(9);
fs.mkdirSync(out, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true });
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const cases = [
  { name: "home", route: "/", reducedMotion: "no-preference", width: 1440, height: 1000 },
  { name: "home-reduced", route: "/", reducedMotion: "reduce", width: 1440, height: 1000 },
  { name: "soil", route: "/soil", reducedMotion: "no-preference", width: 1440, height: 1000 },
  { name: "soil-reduced", route: "/soil", reducedMotion: "reduce", width: 1440, height: 1000 },
  { name: "home-phone", route: "/", reducedMotion: "reduce", width: 390, height: 844, phone: true },
  { name: "soil-phone", route: "/soil", reducedMotion: "reduce", width: 390, height: 844, phone: true },
];
try {
  for (const test of cases.filter((test) => !filter || new RegExp(filter).test(test.name))) {
    const context = await browser.newContext({
      viewport: { width: test.width, height: test.height },
      reducedMotion: test.reducedMotion,
      hasTouch: !!test.phone,
      isMobile: !!test.phone,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const record = { name: test.name, checks: [], states: {}, errors: [] };
    results.push(record);
    page.on("pageerror", (error) => record.errors.push(error.message));
    const check = (name, passed, detail) => {
      record.checks.push({ name, passed: !!passed, detail });
      assert.ok(passed, `${test.name}: ${name}`);
    };
    try {
      await page.goto(`${base}#${test.route}`);
      await page.locator(".boot-overlay").waitFor({ state: "hidden", timeout: 20000 });
      const stage = page.locator("[data-model-stage]").first();
      await stage.scrollIntoViewIfNeeded();
      // Allow the intersection observer to replace the initial opt-in button.
      await page.waitForTimeout(700);
      const explore = stage.getByRole("button", { name: "Explore in 3D", exact: true });
      if (await explore.count()) await explore.click();
      await page.waitForFunction(
        (el) => !!el.dataset.camera && !!el.dataset.bounds && !el.querySelector(".model-loading"),
        await stage.elementHandle(),
        { timeout: 30000 },
      );
      await page.waitForTimeout(1000);
      const state = () => stage.evaluate((el) => ({
        mode: el.dataset.cameraMode,
        camera: JSON.parse(el.dataset.camera),
        bounds: JSON.parse(el.dataset.bounds),
        layers: JSON.parse(el.dataset.layerOffsets),
        clearAlpha: el.dataset.clearAlpha,
        touchAction: el.querySelector("canvas").style.touchAction,
      }));
      const settle = () => page.waitForTimeout(550);
      const capture = async (name) => {
        record.states[name] = await state();
        await stage.screenshot({ path: path.join(out, `${test.name}-${name}.png`) });
        return record.states[name];
      };
      const initial = await capture("initial");
      const b = initial.bounds;
      check("Reset framing starts inside transparent canvas", initial.clearAlpha === "0" &&
        b.left >= -2 && b.top >= -2 && b.left + b.width <= b.viewportWidth + 2 &&
        b.top + b.height <= b.viewportHeight + 2, b);
      await stage.getByRole("button", { name: "Inspect model", exact: true }).click();
      await settle();
      const inspected = await state();
      check("Inspect enables manual orbit and touch gestures", inspected.mode === "manual" &&
        inspected.touchAction === "none", inspected);
      await stage.getByRole("button", { name: "Zoom model in", exact: true }).click();
      await settle();
      const zoomed = await capture("zoom-in");
      check("Plus reduces real camera distance and enlarges projected geometry", zoomed.mode === "manual" &&
        zoomed.camera.distance < inspected.camera.distance * 0.75 &&
        zoomed.bounds.width > inspected.bounds.width * 1.25, { before: inspected, after: zoomed });
      await stage.getByRole("button", { name: "Zoom model out", exact: true }).click();
      await settle();
      const zoomedOut = await state();
      check("Minus increases real camera distance and shrinks projected geometry", zoomedOut.camera.distance >
        zoomed.camera.distance * 1.35 && zoomedOut.bounds.width < zoomed.bounds.width * 0.85,
        { before: zoomed, after: zoomedOut });
      const canvas = stage.locator("canvas");
      const box = await canvas.boundingBox();
      const start = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
      if (test.phone) {
        const session = await context.newCDPSession(page);
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
        for (let i = 1; i <= 8; i++) {
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove", touchPoints: [{ x: start.x + i * 9, y: start.y + i * 2, id: 1 }],
          });
        }
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await session.detach();
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 100, start.y + 30, { steps: 10 });
        await page.mouse.up();
      }
      await settle();
      const orbited = await capture("orbit");
      check(`${test.phone ? "Touch drag" : "Mouse drag"} changes the real camera orientation`,
        distance(orbited.camera.position, zoomedOut.camera.position) > initial.camera.distance * 0.1,
        { before: zoomedOut.camera, after: orbited.camera });
      if (!test.phone) {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down({ button: "right" });
        await page.mouse.move(start.x + 80, start.y + 20, { steps: 8 });
        await page.mouse.up({ button: "right" });
        await settle();
        const panned = await state();
        check("Right drag pans the camera target", distance(panned.camera.target, orbited.camera.target) >
          initial.camera.distance * 0.01, { before: orbited.camera, after: panned.camera });
        // Ctrl+wheel must dolly the actual camera and adjust its target toward the cursor.
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4);
        await page.keyboard.down("Control");
        await page.mouse.wheel(0, -160);
        await page.keyboard.up("Control");
        await settle();
        const wheeled = await state();
        check("Ctrl+wheel zooms toward the pointer", wheeled.camera.distance < panned.camera.distance * 0.95 &&
          distance(wheeled.camera.target, panned.camera.target) > 0.001,
          { before: panned.camera, after: wheeled.camera });
        const scrollBefore = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 100);
        await settle();
        const ordinary = await state();
        const scrollAfter = await page.evaluate(() => scrollY);
        check("Ordinary wheel scrolls the page without camera zoom", scrollAfter > scrollBefore + 30 &&
          Math.abs(ordinary.camera.distance - wheeled.camera.distance) < initial.camera.distance * 0.001,
          { scrollBefore, scrollAfter, before: wheeled.camera, after: ordinary.camera });
      }
      await stage.getByRole("button", { name: "Reset model view", exact: true }).click();
      await settle();
      const reset = await capture("reset");
      check("Reset restores fitted guided camera", reset.mode === "scroll" && reset.touchAction === "pan-y" &&
        Math.abs(reset.camera.distance - initial.camera.distance) < initial.camera.distance * 0.08,
        { initial: initial.camera, reset: reset.camera });
      if (test.route === "/soil") {
        await page.getByRole("button", { name: "Separate layers", exact: true }).click();
        await settle();
        const separated = await state();
        check("Separate layers moves actual parent geometry", separated.layers.Layer_Parent < -0.3, separated.layers);
        await page.getByRole("button", { name: "Follow scroll", exact: true }).click();
        await page.evaluate(() => {
          const el = document.querySelector(".soil-scene-journey");
          scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.22);
        });
        await settle();
        const followed = await state();
        check("Follow scroll restores assembled actual parent geometry", Math.abs(followed.layers.Layer_Parent) < 0.07,
          followed.layers);
        // A previously loaded asset must register fresh working commands after switching back.
        for (const label of ["Groundwater", "Root zone"]) {
          await page.getByRole("button", { name: label, exact: true }).click();
          await stage.getByRole("button", { name: "Inspect model", exact: true }).waitFor({ timeout: 20000 });
          await stage.getByRole("button", { name: "Zoom model in", exact: true }).click();
          await settle();
          check(`Cached ${label} camera commands remain live`, (await state()).mode === "manual");
        }
      }
      const resume = stage.getByRole("button", { name: "Resume scroll", exact: true });
      if (!await resume.count()) {
        await stage.getByRole("button", { name: "Inspect model", exact: true }).click();
      }
      await resume.click();
      await settle();
      check("Resume scroll returns to guided camera", (await state()).mode === "scroll");
      await stage.getByRole("button", { name: "Show model poster", exact: true }).click();
      check("Poster control releases the canvas", await canvas.count() === 0);
      await stage.getByRole("button", { name: "Reload 3D", exact: true }).click();
      await stage.getByRole("button", { name: "Inspect model", exact: true }).waitFor({ timeout: 20000 });
      await stage.getByRole("button", { name: "Zoom model in", exact: true }).click();
      await settle();
      check("Reloaded canvas registers working zoom commands", (await state()).mode === "manual");
      check("No unhandled page errors", record.errors.length === 0, record.errors);
    } catch (error) {
      record.error = String(error);
      await page.screenshot({ path: path.join(out, `${test.name}-failure.png`) });
    } finally {
      console.log(JSON.stringify({ name: record.name, checks: record.checks.length, error: record.error }));
      await context.close();
    }
  }
} finally {
  await browser.close();
  const failures = results.filter((record) => record.error || record.checks.some((check) => !check.passed));
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ base, results,
    limitation: "Actual headless Chromium WebGL and emulated touch; no physical-device or FPS claim." }, null, 2));
  console.log(JSON.stringify({ cases: results.length, checks: results.reduce((count, record) => count + record.checks.length, 0),
    failures: failures.map((record) => ({ name: record.name, error: record.error })) }));
  if (failures.length) process.exitCode = 1;
}
