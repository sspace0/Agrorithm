import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = "assets/textures";
await mkdir(dir, { recursive: true });
const manifest = [];
for (const id of ["forest_ground_04", "aerial_grass_rock", "brown_mud_02"]) {
  const headers = { "User-Agent": "FieldShift-asset-preprocessor/0.1" };
  const info = await (
    await fetch(`https://api.polyhaven.com/info/${id}`, { headers })
  ).json();
  const files = await (
    await fetch(`https://api.polyhaven.com/files/${id}`, { headers })
  ).json();
  if (!info.name) throw Error(`Missing asset ${id}`);
  for (const channel of ["Diffuse", "Rough", "nor_gl"]) {
    const asset = files[channel]?.["1k"]?.jpg;
    if (!asset) throw Error(`Missing ${id} ${channel}`);
    const r = await fetch(asset.url, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw Error(`${r.status} ${asset.url}`);
    const b = Buffer.from(await r.arrayBuffer());
    const file = `${id}_${channel}.jpg`;
    await writeFile(`${dir}/${file}`, b);
    manifest.push({
      title: info.name,
      creators: info.authors,
      page: `https://polyhaven.com/a/${id}`,
      license: "CC0-1.0",
      licenseUrl: "https://polyhaven.com/license",
      retrieved: "2026-11-14",
      url: asset.url,
      file,
      bytes: b.length,
      sha256: createHash("sha256").update(b).digest("hex"),
      modifications:
        "1K provider JPG used; mapped at asset physical scale, color tint on subsoil.",
    });
  }
  console.log(info.name);
}
await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
