import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("keyboard skip link focuses the current page without changing route", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main").first()).toBeFocused();
  await expect(
    page.getByRole("heading", { name: /A different/ }),
  ).toBeVisible();
});
test("crop atlas has genuine zones, soil filters, keyboard map and a separate setup route", async ({
  page,
}) => {
  await page.goto("./#/atlas");
  const satellite = page.getByRole("img", {
    name: "NASA Blue Marble satellite composite, August 2004",
  });
  await expect(satellite).toBeVisible();
  await expect
    .poll(() =>
      satellite.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(5400);
  const marker = await page.locator(".world-pin").evaluate((el) => {
    const pin = el.getBoundingClientRect(),
      image = document
        .querySelector(".satellite-base")!
        .getBoundingClientRect();
    return {
      x: (pin.x + pin.width / 2 - image.x) / image.width,
      y: (pin.bottom - image.y) / image.height,
    };
  });
  expect(marker.x).toBeCloseTo((73 + 180) / 360, 3);
  expect(marker.y).toBeCloseTo((90 - 32.1) / 180, 3);
  await page.getByRole("slider", { name: "Overlay opacity" }).fill("25");
  await expect(page.locator(".map-world canvas")).toHaveCSS("opacity", "0.25");
  await expect(
    page.getByRole("heading", { name: /Different ground/ }),
  ).toBeVisible();
  await expect(page.locator(".atlas-inspector h2")).not.toHaveText("Ocean");
  await page
    .getByRole("combobox", { name: "Atlas crop" })
    .selectOption("maize");
  await page
    .getByRole("combobox", { name: "Atlas soil filter" })
    .selectOption("waterlogged");
  await expect(page.locator(".atlas-fit")).toContainText("Drainage constraint");
  await page.getByRole("application").focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("spinbutton", { name: "Atlas longitude", exact: true }),
  ).toHaveValue("75");
  await page
    .getByRole("button", { name: "Use location in field setup" })
    .click();
  await expect(page).toHaveURL(/studio\/setup/);
  await expect(page.getByLabel("Longitude (°)", { exact: true })).toHaveValue(
    "75",
  );
});
test("scroll changes the soil story and reduced motion keeps it static", async ({
  page,
}) => {
  await page.goto("./");
  const story = page.locator(".scroll-story");
  await story.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const r = document.querySelector(".scroll-story")!.getBoundingClientRect();
    window.scrollTo(0, scrollY + r.top + r.height - innerHeight);
  });
  await expect(story.locator("h2")).toHaveText("See the whole system.");
  await page.getByRole("button", { name: "Motion on", exact: true }).click();
  await expect(story).toHaveClass(/static-story/);
  await expect(story.locator("h2")).toHaveText("Every season leaves a trace.");
  expect(
    await page
      .locator("h1")
      .first()
      .evaluate((e) => getComputedStyle(e).fontFamily),
  ).toContain("Century Gothic");
});
test("opening menu actions and genuine sample", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /A different/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Resume/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Try a sample farm" }).click();
  await expect(page.locator(".lab-summary")).toContainText("2 of 2");
  await expect(page.locator(".warning")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".rotation-card")).toHaveCount(3);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Start planning" }).click();
  await expect(
    page.getByRole("heading", { name: "Your field", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Field name")).toHaveValue("My field");
});
for (const concept of ["studio", "console", "companion"])
  test(`${concept}: complete sample journey, controls and exports`, async ({
    page,
  }) => {
    await page.goto(`./#/${concept}/setup`);
    await page.getByRole("button", { name: "Load sample" }).click();
    await expect(page.locator(".rotation-card")).toHaveCount(3);
    await page.getByRole("link", { name: /The evidence/ }).click();
    await expect(
      page.getByText("Genuine cached observations · 2023"),
    ).toBeVisible();
    await page.getByRole("link", { name: /What if\?/ }).click();
    const before = await page.locator(".scenario-result").first().innerText();
    await page
      .getByRole("slider", { name: "Rainfall relative to history" })
      .fill("50");
    await expect(page.locator(".scenario-result").first()).not.toHaveText(
      before,
    );
    await page
      .getByRole("slider", { name: "Available delivered water" })
      .fill("0");
    await expect(page.locator(".scenario-result").first()).toContainText(
      "infeasible",
    );
    await page.getByRole("link", { name: "Trade-offs", exact: false }).click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Run six sensitivity scenarios" })
      .click();
    await expect(page.getByText("Feasible cases / 6")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("link", { name: "Your plan", exact: false }).click();
    const jsonDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Complete JSON/ }).click();
    const json = await jsonDownload;
    const file = await json.path();
    const data = JSON.parse(readFileSync(file!, "utf8"));
    expect(data.results).toHaveLength(3);
    expect(data.modelVersion).toContain("screening");
    expect(data.vegetation.observations.length).toBeGreaterThan(10);
    expect(data.scenario.rainFactor).toBe(0.5);
    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Portable CSV/ }).click();
    const csv = await csvDownload;
    expect(readFileSync((await csv.path())!, "utf8")).toContain("provenance");
    await page.getByRole("button", { name: "Save on this device" }).click();
    await page.goto("./");
    await expect(
      page.getByRole("button", { name: /Resume your saved plan/ }),
    ).toBeVisible();
  });
test("English remains accessible after removal of the incomplete translation control", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("fieldshift-lang", "ur"));
  await page.goto("./#/companion/setup");
  await expect(
    page.getByRole("button", { name: "Reduced motion", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Switch language" }),
  ).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(
    page.getByRole("heading", { name: "Your field", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCount(1);
});

test("cached sample is usable offline after installation", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Try a sample farm" }).click();
  await expect(page.locator(".lab-summary")).toContainText("2 of 2");
  await page.goto("./#/studio/evidence");
  await expect(
    page.getByText("Genuine cached observations · 2023"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".satellite-base")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(5400);
  await context.close();
});
test("failed live request preserves cached observations", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("https://power.larc.nasa.gov/**", (r) => r.abort("failed"));
  await page.goto("./#/studio/evidence");
  await page
    .getByRole("button", { name: "Update historical weather from NASA" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Cached data remains");
  await expect(page.getByText("2,557 days")).toBeVisible();
  await context.close();
});
test("missing data produces an honest unresolved state", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/data/weather.json", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("./#/studio/lab");
  await expect(page.locator(".rotation-card .status").first()).toContainText(
    "unresolved",
  );
  await expect(page.locator(".rotation-card").first()).toContainText("Unknown");
  await expect(page.getByRole("alert")).toBeVisible();
  await context.close();
});
test("WebGL context loss restores static fallback; layer and groundwater controls work", async ({
  page,
}) => {
  await page.goto("./#/soil");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Groundwater", exact: true }).click();
  await page
    .getByRole("slider", { name: "Illustrative water table depth" })
    .fill("12");
  await page
    .getByText("Model labels & scientific context", { exact: true })
    .click();
  await expect(
    page
      .getByLabel("Model descriptions")
      .getByText("Water table 12 m · user-controlled"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Separate layers" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Inspect model", exact: true }),
  ).toBeVisible();
  await page.locator("canvas").evaluate((c) => {
    const gl = (c as HTMLCanvasElement).getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(
    page.getByText(/3D is unavailable or paused/).first(),
  ).toBeVisible();
  await expect(page.locator(".poster")).toHaveCSS("opacity", "1");
});
test("missing model keeps the poster and navigation usable", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/models/*.glb", (r) => r.abort());
  await page.goto("./#/soil");
  await expect(page.locator(".model-fallback")).toContainText(
    "3D is unavailable or paused",
  );
  await expect(page.locator(".poster").first()).toBeVisible();
  await page.getByRole("link", { name: "Agrorithm home", exact: true }).click();
  await page.getByRole("button", { name: "Try a sample farm" }).click();
  await expect(page.locator(".lab-summary")).toContainText("2 of 2");
  await context.close();
});
test("static mode, moved coordinates, plan import and delete", async ({
  page,
}) => {
  await page.goto("./#/studio/setup");
  await page
    .getByRole("combobox", { name: "Graphics quality" })
    .selectOption("static");
  await page.getByLabel("Latitude (°)", { exact: true }).fill("31");
  await page.getByRole("link", { name: /Rotation lab/ }).click();
  await expect(page.getByRole("alert")).toContainText("field has moved");
  await expect(page.locator(".rotation-card .status").first()).toContainText(
    "unresolved",
  );
  await page.getByRole("link", { name: "Your plan", exact: false }).click();
  await page.getByRole("button", { name: "Save on this device" }).click();
  await page.getByRole("button", { name: "Delete saved plan" }).click();
  await page.goto("./");
  await expect(page.getByRole("button", { name: /Resume/ })).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
});
test("responsive views have no document overflow and preview all three concepts", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "",
      "studio/lab",
      "console/tradeoffs",
      "companion/setup",
    ]) {
      await page.goto(`./#/${route}`);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBeTruthy();
    }
  }
  await page.goto("./#/design");
  await expect(page.locator("iframe")).toHaveCount(6);
});
