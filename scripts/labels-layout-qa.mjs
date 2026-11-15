import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = process.env.VISUAL_QA_URL || "http://127.0.0.1:4173/Agrorithm/";
const out = path.resolve("docs/design/agrorithm/labels-layout");
fs.mkdirSync(out, { recursive: true });
const results = [],
  failures = [];
const check = (record, pass, name, detail) => {
  record.checks.push({ name, passed: !!pass, detail });
  if (!pass)
    failures.push({ case: record.id, viewport: record.viewport, name, detail });
};
const save = () =>
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        base,
        cases: results,
        failures,
        note: "Sequential headless browser checks; simulated viewport sizes are not physical-device/FPS validation.",
      },
      null,
      2,
    ),
  );
const browser = await chromium.launch();
const cases = [
  ...[
    ["maize", "grains"],
    ["mung", "pulses"],
    ["tomato", "vegetables"],
    ["citrus", "fruit"],
  ].map(([crop, id]) => ({ id, route: `/crops?crop=${crop}`, model: true })),
  { id: "root-zone", route: "/soil", model: true },
  { id: "groundwater", route: "/soil", model: true, groundwater: true },
  ...["studio", "console", "companion"].map((concept) => ({
    id: concept,
    route: `/${concept}/evidence`,
  })),
  { id: "atlas", route: "/atlas" },
];
async function setProgress(page, fraction) {
  await page.evaluate((p) => {
    const story =
      document.querySelector(".crop-model-journey") ||
      document.querySelector(".soil-scene-journey");
    const r = story.getBoundingClientRect();
    scrollTo(
      0,
      Math.max(
        0,
        r.top +
          scrollY -
          innerHeight * 0.22 +
          p * (r.height - innerHeight * 0.65),
      ),
    );
  }, fraction);
  await page.waitForTimeout(450);
}
async function boot(page) {
  // The overlay can finish while a click is resolving; wait for its settled state.
  await page
    .locator(".boot-overlay")
    .waitFor({ state: "hidden", timeout: 10000 });
  await page.waitForTimeout(180);
}
try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
    });
    for (const item of cases) {
      const page = await context.newPage(),
        record = {
          id: item.id,
          viewport: viewport.name,
          checks: [],
          screenshots: [],
          errors: [],
        };
      page.on("pageerror", (e) => record.errors.push(e.message));
      try {
        await page.goto(`${base}#${item.route}`);
        await page.evaluate(() => document.fonts.ready);
        await boot(page);
        if (item.groundwater)
          await page
            .getByRole("button", { name: "Groundwater", exact: true })
            .click();
        const layout = await page.evaluate(() => {
          const main =
              document.querySelector(".workspace-main") ||
              document.querySelector("main"),
            style = getComputedStyle(main),
            r = main.getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            leftPadding: parseFloat(style.paddingLeft),
            rightPadding: parseFloat(style.paddingRight),
            width: r.width,
          };
        });
        check(
          record,
          !layout.overflow,
          "No horizontal document overflow",
          layout,
        );
        check(
          record,
          layout.leftPadding >= 19.5 && layout.rightPadding >= 19.5,
          "Readable content has minimum20px gutters",
          layout,
        );
        if (item.model) {
          await setProgress(page, 0.08);
          const stage = page.locator("[data-model-stage]").first();
          const opt = stage.getByRole("button", {
            name: "Explore in 3D",
            exact: true,
          });
          if (await opt.count()) await opt.click();
          await stage.locator("canvas").waitFor({ timeout: 15000 });
          await page.waitForFunction(
            (el) => !!el.dataset.bounds && !el.querySelector(".model-loading"),
            await stage.elementHandle(),
            { timeout: 15000 },
          );
          let totalVisible = 0;
          for (const progress of [0.08, 0.5, 0.95]) {
            await setProgress(page, progress);
            const state = await stage.evaluate((el) => {
              const host = el.getBoundingClientRect(),
                labels = [...el.querySelectorAll("[data-annotation]")].filter(
                  (a) => getComputedStyle(a).visibility === "visible",
                );
              return {
                markers: [...el.querySelectorAll("marker")].map((m) => m.id),
                labels: labels.map((a) => {
                  const g = el.querySelector(
                      `[data-annotation-leader="${a.dataset.annotation}"]`,
                    ),
                    p = g?.querySelector("[data-leader-path]"),
                    r = a.getBoundingClientRect(),
                    end = p?.getPointAtLength(p.getTotalLength());
                  return {
                    id: a.dataset.annotation,
                    leaderVisible: g?.getAttribute("visibility"),
                    d: p?.getAttribute("d"),
                    marker: p?.getAttribute("marker-end"),
                    end: end ? { x: end.x, y: end.y } : null,
                    target: {
                      x: Number(g?.dataset.featureX),
                      y: Number(g?.dataset.featureY),
                    },
                    label: {
                      x: r.left - host.left,
                      y: r.top - host.top,
                      width: r.width,
                      height: r.height,
                    },
                  };
                }),
                width: host.width,
                height: host.height,
              };
            });
            totalVisible += state.labels.length;
            check(
              record,
              state.labels.every(
                (a) =>
                  a.leaderVisible === "visible" &&
                  a.d &&
                  a.marker?.includes(state.markers[0]),
              ),
              `Progress${progress}: each visible label has an arrowed leader`,
              state,
            );
            check(
              record,
              state.labels.every(
                (a) =>
                  a.end &&
                  Math.abs(a.end.x - a.target.x) < 0.1 &&
                  Math.abs(a.end.y - a.target.y) < 0.1 &&
                  a.end.x >= 7 &&
                  a.end.y >= 7 &&
                  a.end.x <= state.width - 7 &&
                  a.end.y <= state.height - 7,
              ),
              `Progress${progress}: leader tips reach visible projected features`,
              state,
            );
            check(
              record,
              state.labels.every(
                (a) =>
                  a.label.x >= -1 &&
                  a.label.y >= -1 &&
                  a.label.x + a.label.width <= state.width + 1 &&
                  a.label.y + a.label.height <= state.height + 1,
              ),
              `Progress${progress}: labels remain within stage`,
              state,
            );
            const name = `${viewport.name}-${item.id}-${Math.round(progress * 100)}.jpg`;
            await page.screenshot({ path: path.join(out, name), quality: 83 });
            record.screenshots.push(name);
          }
          check(
            record,
            totalVisible > 0,
            "At least one actual annotation/arrow is inspected",
            totalVisible,
          );
          await page.locator(".model-description-toggle summary").click();
          check(
            record,
            await page.getByLabel("Model descriptions").isVisible(),
            "Essential model descriptions remain accessible",
            true,
          );
        } else {
          if (item.id !== "atlas") {
            const charts = await page
              .locator(".chart")
              .evaluateAll((elements) =>
                elements.map((el) => {
                  const r = el.getBoundingClientRect();
                  return {
                    host: { x: r.x, y: r.y, width: r.width, height: r.height },
                    outside: [...el.querySelectorAll("svg text")]
                      .filter((t) => {
                        const b = t.getBoundingClientRect();
                        const svg = t.ownerSVGElement,
                          s = svg?.getBoundingClientRect();
                        const clippedBySvg =
                          svg &&
                          s &&
                          getComputedStyle(svg).overflow !== "visible" &&
                          (b.left < s.left - 2 ||
                            b.right > s.right + 2 ||
                            b.top < s.top - 2 ||
                            b.bottom > s.bottom + 2);
                        return (
                          b.width > 0 &&
                          (clippedBySvg ||
                            b.left < r.left - 2 ||
                            b.right > r.right + 2 ||
                            b.top < r.top - 2 ||
                            b.bottom > r.bottom + 2)
                        );
                      })
                      .map((t) => t.textContent),
                  };
                }),
              );
            check(
              record,
              charts.every((c) => c.outside.length === 0),
              "Chart labels remain inside their padded web frames",
              charts,
            );
          }
          const name = `${viewport.name}-${item.id}.jpg`;
          await page.screenshot({ path: path.join(out, name), quality: 83 });
          record.screenshots.push(name);
        }
        check(
          record,
          record.errors.length === 0,
          "No unhandled page errors",
          record.errors,
        );
      } catch (error) {
        check(record, false, "Case completes", String(error));
      }
      results.push(record);
      save();
      await page.close();
    }
    await context.close();
  }
} finally {
  save();
  await browser.close();
}
console.log(
  `Labels/layout QA: ${results.length} cases, ${failures.length} failures.`,
);
if (failures.length) process.exitCode = 1;
