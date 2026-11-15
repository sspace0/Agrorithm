import { test, expect } from "@playwright/test";
test("full-viewport orbital intro keeps navigation inert until completion and restores it on other routes", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  const header = page.locator(".site-header");
  await expect(header).toBeHidden();
  await expect(page.getByRole("button", { name: "Ask Agrorithm", exact: true })).toBeHidden();
  await expect(page.locator(".orbit-backdrop")).toHaveCSS("clip-path", "none");
  await expect(page.locator(".orbit-canvas")).toHaveCSS("clip-path", "none");
  expect(await header.evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  const pin = await page.locator(".orbit-pinned").boundingBox();
  expect(pin!.y).toBeCloseTo(0, 0);
  expect(pin!.height).toBe(page.viewportSize()!.height);
  await expect(
    page.getByRole("button", { name: "Start planning", exact: true }),
  ).toBeVisible();
  await page.locator(".orbit-opening").evaluate((el) => {
    const r = el.getBoundingClientRect(),
      p = el.firstElementChild!.getBoundingClientRect();
    scrollTo(0, scrollY + r.top + 0.98 * (r.height - p.height));
  });
  await expect(header).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask Agrorithm", exact: true })).toBeVisible();
  expect(await header.evaluate((el) => (el as HTMLElement).inert)).toBe(false);
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/#\/atlas/);
  await expect(header).toBeVisible();
  expect(await header.evaluate((el) => (el as HTMLElement).inert)).toBe(false);
});
test("phone can skip the intro and open planning without a header or layout trap", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  await expect(page.locator(".site-header")).toBeHidden();
  await page.getByRole("button", { name: "Skip intro", exact: true }).click();
  await expect(page.locator(".site-header")).toBeVisible();
  await page
    .getByRole("button", { name: "Start planning", exact: true })
    .click();
  await expect(page).toHaveURL(/studio\/setup/);
  expect(
    await page
      .locator(".site-header")
      .evaluate((el) => (el as HTMLElement).inert),
  ).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
  ).toBe(false);
});
for (const mode of ["reduced motion", "static"])
  test(`${mode} makes navigation available immediately`, async ({ page }) => {
    if (mode === "reduced motion")
      await page.emulateMedia({ reducedMotion: "reduce" });
    else
      await page.addInitScript(() =>
        localStorage.setItem("fieldshift-quality", JSON.stringify("static")),
      );
    await page.goto("./");
    await page.locator(".boot-overlay").waitFor({ state: "hidden" });
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Skip intro", exact: true }),
    ).toHaveCount(0);
    expect(
      await page
        .locator(".site-header")
        .evaluate((el) => (el as HTMLElement).inert),
    ).toBe(false);
  });
