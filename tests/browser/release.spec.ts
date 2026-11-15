import { test, expect } from "@playwright/test";

test("refresh prepares the active page and can be skipped while data is pending", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/data/weather.json", async (route) => { await gate; await route.continue(); });
  await page.goto("./#/help", { waitUntil: "domcontentloaded" });
  const overlay = page.getByRole("status", { name: "Preparing Agrorithm" });
  await expect(overlay).toBeVisible();
  await expect(page.locator("main")).toBeAttached();
  expect(Number(await page.getByRole("progressbar", { name: "View preparation" }).getAttribute("aria-valuenow"))).toBeLessThan(5);
  await page.getByRole("button", { name: "Continue while loading" }).click();
  await expect(overlay).toBeHidden();
  release();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeHidden({ timeout: 12000 });
  await expect(page).toHaveURL(/#\/help/);
});

test("the cinematic opening and map use the full viewport width", async ({ page }) => {
  await page.goto("./");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  const opening = page.locator(".orbit-opening");
  const size = await opening.boundingBox();
  expect(size!.height).toBeGreaterThan(3 * page.viewportSize()!.height);
  await opening.evaluate(el => { const r = el.getBoundingClientRect(); scrollTo(0, scrollY + r.top + (r.height - innerHeight) * .98); });
  await expect(page.getByRole("link", { name: "Open the satellite atlas", exact: true })).toBeVisible();
  const canvas = await page.locator(".orbit-canvas canvas").boundingBox();
  expect(canvas!.x).toBeCloseTo(0, 0);
  expect(canvas!.width).toBeCloseTo(page.viewportSize()!.width, 0);
});

for (const concept of ["studio", "console", "companion"]) {
  test(`${concept} draws evidence charts within readable frames`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`./#/${concept}/evidence`);
    await page.locator(".boot-overlay").waitFor({ state: "hidden" });
    await expect(page.locator(".chart svg.recharts-surface")).toHaveCount(3);
    const invalid = await page.locator(".chart").evaluateAll(elements => elements.flatMap(el => {
      const r = el.getBoundingClientRect(), svg = el.querySelector("svg.recharts-surface")!;
      const s = svg.getBoundingClientRect();
      const outside = [...svg.querySelectorAll("text")].filter(t => {const b = t.getBoundingClientRect(); return b.left < r.left - 2 || b.right > r.right + 2 || b.top < r.top - 2 || b.bottom > r.bottom + 2;}).map(t => t.textContent);
      return s.width < 200 || outside.length ? [{ width: s.width, outside }] : [];
    }));
    expect(invalid).toEqual([]);
  });
}
