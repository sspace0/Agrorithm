import { expect, test } from "@playwright/test";
import { SAMPLE } from "../../src/data/sample";
import { DEFAULT_SCENARIO } from "../../src/engine/engine";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("fieldshift-quality", JSON.stringify("static"));
    localStorage.setItem("fieldshift-motion", "false");
  });
});

for (const concept of ["studio", "console", "companion"]) {
  test(`${concept}: dated observations, comparisons and the actual results helper`, async ({ page }) => {
    await page.goto(`./#/${concept}/lab`);
    await page.locator(".boot-overlay").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Load sample", exact: true }).click();
    await expect(page.locator(".comparison-option")).toHaveCount(3);
    await expect(page.getByTestId("weather-data-strip")).toContainText("2018-01-01 → 2024-12-31");
    await expect(page.getByTestId("weather-data-strip")).toContainText("2023-01-05 → 2023-12-31");
    await page.getByRole("button", { name: "Explain my results", exact: true }).click();
    await expect(page.locator(".agr-helper-answer").last()).toContainText("1,517.93 mm");
    await page.getByRole("button", { name: "Close Agrorithm helper", exact: true }).click();
    const soilSummary = page.locator(".soil-proxy-summary");
    await expect(soilSummary).toBeVisible();
    await expect(soilSummary).toContainText("They do not measure soil carbon");
    const evidence = page.locator("details.results-extra").filter({
      has: page.locator("summary", { hasText: "Full NASA data record & soil-health interpretation" }),
    });
    await evidence.locator(":scope > summary").click();
    await expect(evidence.getByTestId("nasa-evidence-panel")).toBeVisible();
    await expect(evidence.getByTestId("nasa-evidence-panel")).toContainText("does not automatically change the numerical rotation score");
    await expect(evidence.getByRole("complementary", { name: "Soil-health interpretation" })).toContainText("do not measure organic carbon");
    const currentName = await page.locator(".field-chip").innerText();
    await page.getByRole("link", { name: "Open your farm plan", exact: true }).click();
    await expect(page.getByLabel("Field name", { exact: true })).toHaveValue(currentName);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  });
}

test("export reset replaces the measured report snapshot without crashing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./#/studio/export");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  await page.goto("./#/studio/export");
  await expect(page.locator(".agr-report")).toHaveAttribute("data-report-ready", "true", { timeout: 30000 });
  await page.getByRole("button", { name: "Reset all inputs", exact: true }).click();
  await expect(page.locator(".agr-report")).toHaveAttribute("data-report-ready", "true", { timeout: 30000 });
  await expect(page.locator(".comparison-option").first()).toContainText("Not ranked");
  await page.locator(".comparison-option").first().getByText("Why is this not ranked?", { exact: true }).click();
  await expect(page.locator(".comparison-option").first()).toContainText("existing crop sequence has not been supplied");
  await page.getByRole("button", { name: "Explain my results", exact: true }).click();
  await expect(page.locator(".agr-helper-answer").last()).toContainText("existing crop sequence has not been supplied");
  expect(errors).toEqual([]);
});

test("print preserves every measured page, chart and crop image", async ({ page }) => {
  await page.goto("./#/studio/export");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await expect(page.locator(".agr-report")).toHaveAttribute("data-report-ready", "true", { timeout: 30000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll<HTMLImageElement>(".agr-report img")].map(image => image.decode()));
    window.dispatchEvent(new Event("agrorithm-report-remeasure"));
  });
  await expect(page.locator(".agr-report")).toHaveAttribute("data-report-ready", "true", { timeout: 30000 });
  const pages = await page.locator(".agr-report-page").count();
  expect(pages).toBeGreaterThan(20);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect([...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)]).toHaveLength(pages);
  await expect(page.locator(".agr-report-page svg.agr-chart")).toHaveCount(7);
  await expect(page.locator(".agr-report-page .agr-crop-image img")).toHaveCount(4);
  await page.emulateMedia({ media: "screen" });
  await expect(page.getByRole("button", { name: "Reset all inputs", exact: true })).toBeVisible();
});

test("known water-budget exceedance is red; unknown evidence stays unclassified", async ({ page }) => {
  await page.addInitScript(({ farm, scenario }) => {
    localStorage.setItem("fieldshift-plan", JSON.stringify({ farm, scenario }));
  }, { farm: { ...SAMPLE, waterLimitMm: 100 }, scenario: DEFAULT_SCENARIO });
  await page.goto("./#/studio/lab");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await expect(page.locator('.input-assessment-row.assessment-exceeds')).toHaveCount(3);
  await expect(page.locator('.input-assessment-row.assessment-exceeds').first()).toContainText("mm above your budget");
});
