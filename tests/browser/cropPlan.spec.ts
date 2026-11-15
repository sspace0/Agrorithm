import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

mkdirSync("docs/design/agrorithm/crop-plan", { recursive: true });

test("crop view hands an annual preference to the plan without replacing saved inputs", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fieldshift-quality", JSON.stringify("static")));
  await page.goto("./#/studio/setup");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await page.getByLabel("Field name", { exact: true }).fill("Crop handoff test field");
  const dates = await page.locator(".sequence-editor input[type=date]").evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  await page.getByRole("link", { name: "3D explorer", exact: true }).click();
  await page.getByRole("link", { name: "Crop models", exact: true }).click();
  await page.getByRole("button", { name: "Wheat", exact: true }).click();
  await page.getByRole("button", { name: "Plan with wheat", exact: true }).click();
  await expect(page).toHaveURL(/studio\/setup/);
  await expect(page.getByRole("combobox", { name: "Crop to explore", exact: true })).toHaveValue("wheat");
  await expect(page.getByLabel("Field name", { exact: true })).toHaveValue("Crop handoff test field");
  expect(await page.locator(".sequence-editor input[type=date]").evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value))).toEqual(dates);
  await page.waitForTimeout(650);
  await page.screenshot({ path: "docs/design/agrorithm/crop-plan/wheat-setup.jpg", quality: 85 });
  await page.getByRole("button", { name: "Review dates & crop sequence", exact: true }).click();
  await expect(page.locator("#field-sequence")).toBeFocused();
  await page.getByRole("link", { name: "Your plan", exact: false }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Complete JSON/ }).click();
  expect(JSON.parse(readFileSync((await (await downloaded).path())!, "utf8")).farm.cropInterest).toBe("wheat");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await page.reload();
  await page.getByRole("link", { name: "Your field", exact: false }).click();
  await expect(page.getByRole("combobox", { name: "Crop to explore", exact: true })).toHaveValue("wheat");
});

test("fruit choice reaches field setup with explicit perennial limitations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("fieldshift-quality", JSON.stringify("static")));
  await page.goto("./#/crops?crop=citrus");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Plan with citrus", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Crop to explore", exact: true })).toHaveValue("citrus");
  await expect(page.getByLabel("Crop selected for planning")).toContainText("outside the annual 36-month rotation model");
  await expect(page.getByRole("button", { name: "Review dates & crop sequence", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.waitForTimeout(650);
  await page.screenshot({ path: "docs/design/agrorithm/crop-plan/phone-citrus-setup.jpg", quality: 85 });
});
