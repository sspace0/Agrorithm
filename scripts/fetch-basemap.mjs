import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const page =
  "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/";
const html = await (
  await fetch(page, { signal: AbortSignal.timeout(30000) })
).text();
const candidates = [...html.matchAll(/https:[^"<> ]+\.jpg/g)].map((x) => x[0]);
const url = candidates.find(
  (u) =>
    u.includes("/content/dam/") && u.includes("world.200408.3x5400x2700.jpg"),
);
if (!url)
  throw Error(
    "Verified August 2004 download link is missing from the NASA source page",
  );
const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw Error(`NASA image download failed: ${response.status}`);
const image = Buffer.from(await response.arrayBuffer());
if (image[0] !== 255 || image[1] !== 216) throw Error("Expected JPEG");
await mkdir("public/images", { recursive: true });
await writeFile("public/images/blue-marble-2004-08.jpg", image);
const manifest = {
  title: "Blue Marble: Next Generation · August 2004",
  publisher: "NASA Earth Observatory",
  creators: ["Reto Stöckli", "Robert Simmon"],
  page,
  url,
  observationPeriod: "2004-08",
  sourceDimensions: [5400, 2700],
  spatialSupport:
    "Global monthly MODIS true-color composite; provider preview about 8 km/pixel. Not current imagery or field detail.",
  retrieved: "2026-11-14",
  license: "NASA imagery use guidelines; source offered for public use",
  licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  sha256: createHash("sha256").update(image).digest("hex"),
  bytes: image.length,
  modifications:
    "Bundled original JPEG without pixel edits; independent climate/crop overlay rendered above it.",
};
await writeFile(
  "public/data/basemap-provenance.json",
  JSON.stringify(manifest, null, 2),
);
console.log(manifest);
