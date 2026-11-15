import { test, expect } from "@playwright/test";

test("atlas wheel zoom keeps its cursor anchor, extends to24x and preserves selection while panning", async ({
  page,
}) => {
  await page.goto("./#/atlas");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  const map = page.getByRole("application");
  await map.scrollIntoViewIfNeeded();
  const r = (await map.boundingBox())!,
    cursor = {
      x: Math.round(r.x + r.width * 0.43),
      y: Math.round(r.y + r.height * 0.37),
    },
    anchor = { x: (cursor.x - r.x) / r.width, y: (cursor.y - r.y) / r.height };
  const read = () =>
    map.evaluate((el) => ({
      zoom: Number((el as HTMLElement).dataset.zoom),
      x: Number((el as HTMLElement).dataset.panX),
      y: Number((el as HTMLElement).dataset.panY),
    }));
  const before = await read(),
    scroll = await page.evaluate(() => scrollY);
  await page.mouse.move(cursor.x, cursor.y);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => (await read()).zoom).toBeGreaterThan(1);
  const after = await read();
  expect((anchor.x - after.x) / after.zoom).toBeCloseTo(
    (anchor.x - before.x) / before.zoom,
    10,
  );
  expect((anchor.y - after.y) / after.zoom).toBeCloseTo(
    (anchor.y - before.y) / before.zoom,
    10,
  );
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await page.mouse.move(r.x + r.width * 0.55, r.y + r.height * 0.5);
  const selected = await page
    .getByLabel("Atlas longitude", { exact: true })
    .inputValue();
  const oldPan = (await read()).x;
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.7, r.y + r.height * 0.56, {
    steps: 12,
  });
  await page.mouse.up();
  expect((await read()).x).not.toBe(oldPan);
  await expect(page.getByLabel("Atlas longitude", { exact: true })).toHaveValue(
    selected,
  );
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.35);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(50);
  }
  await expect.poll(async () => (await read()).zoom).toBe(24);
  await expect(
    page.getByRole("button", { name: "Zoom world map in", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await expect.poll(read).toEqual({ zoom: 1, x: 0, y: 0 });
  await map.focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Scroll zoom off", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("atlas two-finger pinch zooms while one finger can scroll the phone page", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("./#/atlas");
  await page.locator(".boot-overlay").waitFor({ state: "hidden" });
  const map = page.getByRole("application");
  await map.scrollIntoViewIfNeeded();
  const r = (await map.boundingBox())!,
    cx = r.x + r.width * 0.5,
    cy = r.y + r.height * 0.38;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: cx - 35, y: cy },
      { x: cx + 35, y: cy },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: cx - 70, y: cy },
      { x: cx + 70, y: cy },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => map.getAttribute("data-zoom").then(Number))
    .toBeGreaterThan(1.5);
  const start = await page.evaluate(() => scrollY);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: cx, y: cy + 30 }],
  });
  for (const y of [cy + 10, cy - 20, cy - 50])
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: cx, y }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(start + 15);
  await context.close();
});
