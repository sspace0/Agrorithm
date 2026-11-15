// Encode only the groundwater poster after its Blender detail pass.
import fs from "node:fs";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const source = fs
    .readFileSync("public/images/groundwater-v2.png")
    .toString("base64");
  const encoded = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/png;base64,${source}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(1200, image.width);
    canvas.height = Math.round((image.height * canvas.width) / image.width);
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82).split(",")[1];
  }, source);
  const poster = Buffer.from(encoded, "base64");
  fs.writeFileSync("public/images/groundwater-v2.webp", poster);
  const file = "assets/blender/validation-v2.json";
  const validation = JSON.parse(fs.readFileSync(file, "utf8"));
  const groundwater = validation.scenes.find(
    (item) => item.scene === "groundwater-v2",
  );
  groundwater.runtimePosterWebpBytes = poster.length;
  groundwater.posterProcessing = {
    encoder: "Chromium canvas WebP",
    browser: await browser.version(),
    quality: 0.82,
    maxWidth: 1200,
  };
  fs.writeFileSync(file, JSON.stringify(validation, null, 2));
  console.log(
    JSON.stringify({ scene: groundwater.scene, posterBytes: poster.length }),
  );
} finally {
  await browser.close();
}
