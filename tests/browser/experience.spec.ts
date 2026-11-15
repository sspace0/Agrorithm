import { test, expect } from "@playwright/test";
test("global search opens with the keyboard and reaches tools without losing field inputs", async ({
  page,
}) => {
  await page.goto("./#/studio/setup");
  await page.getByLabel("Field name").fill("Test field kept locally");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search Agrorithm" });
  await expect(dialog).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search pages, crops and questions" })
    .fill("map");
  await dialog.getByRole("link", { name: /Satellite crop atlas/ }).click();
  await expect(page).toHaveURL(/atlas/);
  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page.getByLabel("Field name")).toHaveValue(
    "Test field kept locally",
  );
});
test("location search uses genuine cached places, manual coordinates and honest failed online search", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("https://geocoding-api.open-meteo.com/**", (r) => r.abort());
  await page.goto("./#/atlas");
  const input = page.getByRole("searchbox", { name: "Search map locations" });
  await input.fill("Lahore");
  await page
    .getByRole("button", { name: "Lahore, Pakistan", exact: true })
    .click();
  await expect(page.getByLabel("Atlas latitude", { exact: true })).toHaveValue(
    "31.558",
  );
  await input.fill("-33.9, 151.2");
  await page
    .getByRole("button", { name: "Find location", exact: true })
    .click();
  await expect(page.getByLabel("Atlas longitude", { exact: true })).toHaveValue(
    "151.2",
  );
  await input.fill("Uncached place");
  await page
    .getByRole("button", { name: "Search online", exact: true })
    .click();
  await expect(
    page.getByText(/Online place search is unavailable/),
  ).toBeVisible();
  await expect(page.getByLabel("Atlas longitude", { exact: true })).toHaveValue(
    "151.2",
  );
  await context.close();
});
test("four illustrated crop categories retain eight references and one visible model", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto("./#/crops");
  await expect(
    page.getByRole("heading", { name: /Explore crop options/ }),
  ).toBeVisible();
  await expect(page.locator(".crop-picks button img")).toHaveCount(4);
  for (const [group, crops, model] of [
    ["Grains", ["Wheat", "Maize"], "maize"],
    ["Pulses", ["Mungbean", "Chickpea"], "mungbean"],
    ["Vegetables", ["Tomato", "Potato"], "tomato"],
    ["Fruit trees", ["Citrus", "Mango"], "citrus"],
  ] as const) {
    await page
      .locator(".crop-picks")
      .getByRole("button", { name: new RegExp(group) })
      .click();
    for (const crop of crops) {
      await page
        .locator(".plant-description .profile-picks")
        .getByRole("button", { name: crop, exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: crop + " growing reference" }),
      ).toBeVisible();
      await expect(page.locator(".profile-facts dt")).toHaveCount(7);
    }
    await expect(page.locator("[data-model-stage] canvas")).toBeVisible();
    await expect(page.locator(".model-presentation")).toHaveAttribute(
      "data-model-url",
      new RegExp(model + "\\.glb"),
    );
    await expect(
      page.getByRole("button", { name: "Inspect model", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-model-stage] canvas")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Show model poster" }).click();
  await expect(page.locator("[data-model-stage] canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Reload 3D", exact: true }).click();
  await expect(page.locator("[data-model-stage] canvas")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Graphics quality" })
    .selectOption("static");
  await expect(page.locator("[data-model-stage] canvas")).toHaveCount(0);
  await context.close();
});

test("phones start with a useful poster and no soil model download", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const models: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/models/")) models.push(r.url());
  });
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Start planning", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".orbit-canvas")).toBeVisible();
  expect(models).toHaveLength(0);
  await page
    .getByRole("button", { name: "Try a sample farm", exact: true })
    .click();
  await expect(page.locator(".rotation-card")).toHaveCount(3);
  await context.close();
});
test("keyless question helper answers documented topics and does not invent unsupported answers", async ({
  page,
}) => {
  await page.goto("./#/help");
  const input = page.getByRole("searchbox", {
    name: "Search the question guide",
  });
  await input.fill("How much water does my crop need?");
  await expect(
    page.getByRole("heading", { name: "What do the water numbers mean?" }),
  ).toBeVisible();
  await input.fill("quasars");
  await expect(
    page.getByRole("heading", { name: "This guide cannot answer that yet." }),
  ).toBeVisible();
});
