import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
declare global {
  interface Window {
    geoCalls: number;
    pendingLocation: PositionCallback;
  }
}

test("device location is requested only on click and provenance follows the farm", async ({
  browser,
}) => {
  const context = await browser.newContext({
    permissions: ["geolocation"],
    geolocation: { latitude: 31.558, longitude: 74.35, accuracy: 25 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const w = window as Window & { geoCalls: number };
    w.geoCalls = 0;
    const native = navigator.geolocation.getCurrentPosition.bind(
      navigator.geolocation,
    );
    navigator.geolocation.getCurrentPosition = (...args) => {
      w.geoCalls++;
      return native(...args);
    };
  });
  await page.goto("./#/atlas");
  expect(
    await page.evaluate(
      () => (window as Window & { geoCalls: number }).geoCalls,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Find your farm’s location", exact: true })
    .click();
  await expect(page.getByLabel("Atlas latitude", { exact: true })).toHaveValue(
    "31.558",
  );
  await expect(page.locator(".location-estimate")).toContainText("±25 m");
  await page
    .getByRole("button", { name: "Use location in field setup" })
    .click();
  await expect(page.getByLabel("Latitude (°)", { exact: true })).toHaveValue(
    "31.558",
  );
  await expect(page.locator(".location-estimate")).toContainText("±25 m");
  await page.getByRole("link", { name: /Your plan/ }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Complete JSON/ }).click();
  const data = JSON.parse(readFileSync((await (await event).path())!, "utf8"));
  expect(data.farm.coordinateEvidence).toMatchObject({
    method: "device-geolocation",
    accuracyM: 25,
  });
  expect(Date.parse(data.farm.coordinateEvidence.capturedAt)).toBeGreaterThan(
    0,
  );
  await page.getByRole("link", { name: /Your field/ }).click();
  await page.getByLabel("Latitude (°)", { exact: true }).fill("32");
  await expect(page.locator(".location-estimate")).toHaveCount(0);
  await context.close();
});

test("denied geolocation keeps existing coordinates and manual entry available", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _ok: PositionCallback,
          error: PositionErrorCallback,
        ) => error({ code: 1 } as GeolocationPositionError),
      },
    }),
  );
  await page.goto("./#/studio/setup");
  const before = await page
    .getByLabel("Latitude (°)", { exact: true })
    .inputValue();
  await page
    .getByRole("button", { name: "Find your farm’s location", exact: true })
    .click();
  await expect(page.locator(".location-error")).toContainText(
    "permission was denied",
  );
  await expect(page.getByLabel("Latitude (°)", { exact: true })).toHaveValue(
    before,
  );
  await page.getByLabel("Latitude (°)", { exact: true }).fill("31");
  await expect(page.getByLabel("Latitude (°)", { exact: true })).toHaveValue(
    "31",
  );
});

test("a late device response cannot replace a newer manual location", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (ok: PositionCallback) => {
          (
            window as Window & { pendingLocation: PositionCallback }
          ).pendingLocation = ok;
        },
      },
    }),
  );
  await page.goto("./#/studio/setup");
  await page
    .getByRole("button", { name: "Find your farm’s location", exact: true })
    .click();
  await page.getByLabel("Latitude (°)", { exact: true }).fill("35");
  await page.evaluate(() =>
    (window as Window & { pendingLocation: PositionCallback }).pendingLocation({
      coords: { latitude: 31.558, longitude: 74.35, accuracy: 25 },
      timestamp: Date.now(),
    } as GeolocationPosition),
  );
  await expect(page.getByLabel("Latitude (°)", { exact: true })).toHaveValue(
    "35",
  );
  await expect(page.locator(".location-estimate")).toHaveCount(0);
});

test("future observation filters are clamped and valid selections survive navigation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "agrorithm-evidence-filter",
      JSON.stringify({ start: "2026-01-01", end: "2026-12-31" }),
    ),
  );
  await page.goto("./#/studio/evidence");
  await expect(page.getByLabel("Weather view start")).toHaveValue("2024-12-31");
  await expect(page.getByLabel("Weather view end")).toHaveValue("2024-12-31");
  await page.getByLabel("Weather view start").fill("2023-01-01");
  await page.getByLabel("Weather view end").fill("2023-12-31");
  await page.getByRole("link", { name: /Rotation lab/ }).click();
  await page.getByRole("link", { name: /The evidence/ }).click();
  await expect(page.getByLabel("Weather view start")).toHaveValue("2023-01-01");
  await expect(page.getByLabel("Weather view end")).toHaveValue("2023-12-31");
});
