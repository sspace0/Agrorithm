import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.MODEL_REVIEW_URL || "http://127.0.0.1:5199/Agrorithm/";
const filter = process.argv
  .find((argument) => argument.startsWith("--filter="))
  ?.slice(9);
const out = path.resolve("docs/design/agrorithm/model-review");
fs.mkdirSync(out, { recursive: true });
const results = [];
const cases = [
  ["maize", "/crops?crop=maize"],
  ["mungbean", "/crops?crop=mung"],
  ["tomato", "/crops?crop=tomato"],
  ["citrus", "/crops?crop=citrus"],
  ["root-zone", "/soil"],
  ["groundwater", "/soil"],
];
async function scrollScene(page, progress = 0.5) {
  await page.evaluate((progress) => {
    const el = document.querySelector(
      ".crop-model-journey,.soil-scene-journey",
    );
    const r = el.getBoundingClientRect();
    scrollTo(
      0,
      r.top +
        scrollY -
        innerHeight * 0.22 +
        progress * (r.height - innerHeight * 0.65),
    );
  }, progress);
  await page.waitForTimeout(500);
}
async function wetBluePixels(stage, page) {
  const capture = (await stage.screenshot({ type: "png" })).toString("base64");
  return page.evaluate(async (capture) => {
    const image = new Image();
    image.src = `data:image/png;base64,${capture}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let blue = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      if (
        pixels[i + 3] > 200 &&
        b > r * 1.12 &&
        g > r * 1.06 &&
        b > g * 1.03 &&
        b < 210
      )
        blue++;
    }
    return blue;
  }, capture);
}
function waterPlaneDepthConsistency({ wetPlane7, wetPlane12, before, after }) {
  const planes = [wetPlane7, wetPlane12, before, after];
  if (
    !planes.every(
      (plane) => plane?.length === 4 && plane.every(Number.isFinite),
    )
  )
    return false;
  const normalized = planes.every(
    (plane) => Math.abs(Math.hypot(...plane.slice(0, 3)) - 1) < 0.0001,
  );
  const wetDelta = wetPlane7[3] - wetPlane12[3];
  const clippedDelta = before[3] - after[3];
  return (
    normalized &&
    Math.abs(wetDelta - 0.5) < 0.001 &&
    Math.abs(wetDelta - clippedDelta) < 0.001
  );
}
const recording = process.argv
  .find((argument) => argument.startsWith("--verify-recording="))
  ?.slice(19);
if (recording) {
  const recorded = JSON.parse(fs.readFileSync(recording, "utf8"));
  for (const result of recorded.results) {
    for (const check of result.checks) {
      if (!check.name.startsWith("Wet mineral shading")) continue;
      check.name =
        "Wet mineral and clipped pore planes track the same depth change in world/view coordinates";
      check.passed = waterPlaneDepthConsistency(check.detail);
    }
  }
  recorded.failures = recorded.results.flatMap((result) =>
    result.checks
      .filter((check) => !check.passed)
      .map((check) => ({ id: result.id, viewport: result.viewport, ...check })),
  );
  recorded.recordingVerification = {
    source: recording,
    verified: new Date().toISOString(),
    reason:
      "The material plane is uploaded in world coordinates; Three.js transforms its clipping plane to view coordinates. Their constants differ, but the observed7→12m depth deltas must agree. Actual browser/image observations are unchanged.",
  };
  fs.writeFileSync(
    path.join(out, "results-verified.json"),
    JSON.stringify(recorded, null, 2),
  );
  console.log(
    JSON.stringify({
      cases: recorded.results.length,
      checks: recorded.results.reduce(
        (count, result) => count + result.checks.length,
        0,
      ),
      failures: recorded.failures,
    }),
  );
  process.exit(recorded.failures.length ? 1 : 0);
}
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
    });
    // Observe actual WebGL clipping uniforms without changing rendering behavior.
    await context.addInitScript(() => {
      window.__modelReviewClipping = [];
      window.__modelReviewSaturation = [];
      for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
        const names = new WeakMap();
        const originalLocation = type.prototype.getUniformLocation;
        const originalUniform = type.prototype.uniform4fv;
        const originalSingleUniform = type.prototype.uniform4f;
        type.prototype.getUniformLocation = function (program, name) {
          const result = originalLocation.call(this, program, name);
          if (result) names.set(result, name);
          return result;
        };
        type.prototype.uniform4fv = function (location, value, ...rest) {
          if (names.get(location)?.startsWith("clippingPlanes")) {
            window.__modelReviewClipping.push(Array.from(value));
            if (window.__modelReviewClipping.length > 30)
              window.__modelReviewClipping.shift();
          }
          if (names.get(location) === "illustrativeSaturationPlane") {
            window.__modelReviewSaturation.push(Array.from(value));
            if (window.__modelReviewSaturation.length > 30)
              window.__modelReviewSaturation.shift();
          }
          return originalUniform.call(this, location, value, ...rest);
        };
        type.prototype.uniform4f = function (location, x, y, z, w) {
          if (names.get(location) === "illustrativeSaturationPlane") {
            window.__modelReviewSaturation.push([x, y, z, w]);
            if (window.__modelReviewSaturation.length > 30)
              window.__modelReviewSaturation.shift();
          }
          return originalSingleUniform.call(this, location, x, y, z, w);
        };
      }
    });
    for (const [id, route] of cases.filter(
      ([id]) => !filter || new RegExp(filter).test(id),
    )) {
      const page = await context.newPage();
      const record = {
        id,
        viewport: viewport.name,
        checks: [],
        errors: [],
        screenshots: [],
      };
      const check = (name, passed, detail) =>
        record.checks.push({ name, passed: !!passed, detail });
      page.on("pageerror", (error) => record.errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") record.errors.push(message.text());
      });
      try {
        await page.goto(`${base}#${route}`);
        await page
          .locator(".boot-overlay")
          .waitFor({ state: "hidden", timeout: 15000 });
        if (id === "groundwater")
          await page
            .getByRole("button", { name: "Groundwater", exact: true })
            .click();
        await scrollScene(page);
        const stage = page.locator("[data-model-stage]").first();
        const opt = stage.getByRole("button", {
          name: "Explore in 3D",
          exact: true,
        });
        if (await opt.count()) await opt.click();
        await page.waitForFunction(
          (el) => !!el.dataset.bounds && !el.querySelector(".model-loading"),
          await stage.elementHandle(),
          { timeout: 20000 },
        );
        const layerPositions = [];
        for (const progress of id === "groundwater" || id === "root-zone"
          ? [0.08, 0.5, 0.95]
          : [0.5]) {
          await scrollScene(page, progress);
          const state = await stage.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const labels = [...el.querySelectorAll("[data-annotation]")].filter(
              (a) => getComputedStyle(a).visibility === "visible",
            );
            return {
              width: r.width,
              height: r.height,
              clearAlpha: el.dataset.clearAlpha,
              bounds: JSON.parse(el.dataset.bounds),
              layerOffsets: JSON.parse(el.dataset.layerOffsets || "{}"),
              invalidLabels: labels
                .filter((a) => {
                  const b = a.getBoundingClientRect();
                  const leader = el.querySelector(
                    `[data-annotation-leader="${a.dataset.annotation}"]`,
                  );
                  return (
                    b.left < r.left ||
                    b.right > r.right + 1 ||
                    b.top < r.top ||
                    b.bottom > r.bottom + 1 ||
                    leader?.getAttribute("visibility") !== "visible"
                  );
                })
                .map((a) => a.dataset.annotation),
            };
          });
          check(
            `Progress${progress}: large transparent stage`,
            state.width >= viewport.width * 0.5 &&
              state.height >= viewport.height * 0.5 &&
              state.clearAlpha === "0",
            state,
          );
          const b = state.bounds;
          layerPositions.push({ progress, offsets: state.layerOffsets });
          check(
            `Progress${progress}: fitted geometry is inside the canvas`,
            b.left >= -2 &&
              b.top >= -2 &&
              b.left + b.width <= b.viewportWidth + 2 &&
              b.top + b.height <= b.viewportHeight + 2,
            b,
          );
          check(
            `Progress${progress}: backed annotations and arrows are safe`,
            state.invalidLabels.length === 0,
            state.invalidLabels,
          );
          const image = `${viewport.name}-${id}-${Math.round(progress * 100)}.jpg`;
          await page.screenshot({ path: path.join(out, image), quality: 86 });
          record.screenshots.push(image);
        }
        if (id === "root-zone") {
          const parent = layerPositions.map(
            (item) => item.offsets.Layer_Parent,
          );
          check(
            "Scroll separates then reassembles the actual parent layer",
            Math.abs(parent[0]) < 0.05 &&
              parent[1] < -0.3 &&
              Math.abs(parent[2]) < 0.06,
            layerPositions,
          );
          await page
            .getByRole("button", { name: "Separate layers", exact: true })
            .click();
          await scrollScene(page, 0.08);
          await page.waitForTimeout(450);
          const manualOffsets = await stage.evaluate((el) =>
            JSON.parse(el.dataset.layerOffsets),
          );
          check(
            "Manual layer selection overrides the scroll reveal",
            manualOffsets.Layer_Parent < -0.3,
            manualOffsets,
          );
          await page
            .getByRole("button", { name: "Follow scroll", exact: true })
            .click();
          await scrollScene(page, 0.08);
          await page.waitForTimeout(450);
          const resumedOffsets = await stage.evaluate((el) =>
            JSON.parse(el.dataset.layerOffsets),
          );
          check(
            "Follow scroll restores the assembled starting profile",
            Math.abs(resumedOffsets.Layer_Parent) < 0.05,
            resumedOffsets,
          );
        }
        await stage
          .getByRole("button", { name: "Zoom model in", exact: true })
          .click();
        check(
          "Manual zoom takes control",
          (await stage.getAttribute("data-camera-mode")) === "manual",
          true,
        );
        await stage
          .getByRole("button", { name: "Reset model view", exact: true })
          .click();
        await page.waitForTimeout(200);
        check(
          "Reset restores guided camera",
          (await stage.getAttribute("data-camera-mode")) === "scroll",
          true,
        );
        if (id === "groundwater") {
          await scrollScene(page);
          await stage
            .getByRole("button", { name: "Inspect model", exact: true })
            .click();
          await page.waitForTimeout(250);
          const before = await page.evaluate(() =>
            window.__modelReviewClipping.at(-1),
          );
          const blue7 = await wetBluePixels(stage, page);
          const wetPlane7 = await page.evaluate(() =>
            window.__modelReviewSaturation.at(-1),
          );
          const depth = page.getByRole("slider", {
            name: "Illustrative water table depth",
          });
          await depth.fill("12");
          await scrollScene(page);
          await page.waitForTimeout(250);
          const after = await page.evaluate(() =>
            window.__modelReviewClipping.at(-1),
          );
          const blue12 = await wetBluePixels(stage, page);
          const wetPlane12 = await page.evaluate(() =>
            window.__modelReviewSaturation.at(-1),
          );
          check(
            "Wet mineral and clipped pore planes track the same depth change in world/view coordinates",
            waterPlaneDepthConsistency({
              wetPlane7,
              wetPlane12,
              before,
              after,
            }),
            { wetPlane7, wetPlane12, before, after },
          );
          check(
            "Detailed water has an active clipping plane in WebGL",
            before?.length === 4 && after?.length === 4,
            { before, after },
          );
          check(
            "User depth recomputes the real clipping uniform",
            before && after && Math.abs(before[3] - after[3]) > 0.4,
            { before, after },
          );
          const image = `${viewport.name}-groundwater-depth12.jpg`;
          await page.screenshot({ path: path.join(out, image), quality: 88 });
          record.screenshots.push(image);
          await depth.fill("3");
          await scrollScene(page);
          const shallow = await page.evaluate(() =>
            window.__modelReviewClipping.at(-1),
          );
          const blue3 = await wetBluePixels(stage, page);
          check(
            "Actual blue wet-area pixels shrink at12m and expand at3m",
            blue7 > 100 && blue7 > blue12 * 1.2 && blue3 > blue7 * 1.2,
            { blue7, blue12, blue3 },
          );
          check(
            "Shallow depth updates the same clipping plane",
            shallow?.length === 4 && Math.abs(shallow[3] - after[3]) > 0.8,
            { shallow, after },
          );
        }
        await page.locator(".model-description-toggle summary").click();
        check(
          "Text descriptions remain accessible",
          await page.getByLabel("Model descriptions").isVisible(),
          true,
        );
        check("No unhandled page errors", !record.errors.length, record.errors);
      } catch (error) {
        check("Case completes", false, String(error));
      }
      results.push(record);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  const failures = results.flatMap((record) =>
    record.checks
      .filter((check) => !check.passed)
      .map((check) => ({ id: record.id, viewport: record.viewport, ...check })),
  );
  fs.writeFileSync(
    path.join(out, filter ? "results-targeted.json" : "results.json"),
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        base,
        results,
        failures,
        limitation:
          "Headless viewport checks and actual WebGL uniform observation; no physical-device or FPS claim.",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      cases: results.length,
      checks: results.reduce((n, item) => n + item.checks.length, 0),
      failures,
    }),
  );
  if (failures.length) process.exitCode = 1;
}
