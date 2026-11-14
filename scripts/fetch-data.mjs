import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = "public/data";
await mkdir(dir, { recursive: true });
const latitude = 32.1,
  longitude = 73;
async function get(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(120000),
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return r.json();
}
const provenance = [];
async function save(name, data, url) {
  const body = JSON.stringify(data);
  await writeFile(`${dir}/${name}`, body);
  provenance.push({
    file: name,
    url,
    retrieved: "2026-11-14",
    sha256: createHash("sha256").update(body).digest("hex"),
    status: "genuine cached observation",
  });
}
// Seven complete years allow four consecutive three-year historical replays.
const weather = [];
let header, geometry, parameters;
for (let year = 2018; year <= 2024; year++) {
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MIN,T2M_MAX,PRECTOTCORR&community=AG&longitude=${longitude}&latitude=${latitude}&start=${year}0101&end=${year}1231&format=JSON&time-standard=UTC`;
  const raw = await get(url);
  header = raw.header;
  geometry = raw.geometry;
  parameters = raw.parameters;
  await save(`power-${year}.json`, raw, url);
  const p = raw.properties.parameter;
  for (const key of Object.keys(p.T2M_MIN)) {
    const clean = (v) =>
      Number.isFinite(v) && v !== raw.header.fill_value && v !== -999
        ? v
        : null;
    weather.push({
      date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`,
      min: clean(p.T2M_MIN[key]),
      max: clean(p.T2M_MAX[key]),
      rain: clean(p.PRECTOTCORR[key]),
    });
  }
  console.log("POWER", year, Object.keys(p.T2M_MIN).length);
}
await writeFile(
  `${dir}/weather.json`,
  JSON.stringify({
    publisher: "NASA POWER",
    product: "POWER daily point API",
    latitude,
    longitude,
    timeStandard: "UTC",
    header,
    geometry,
    parameters,
    spatialSupport:
      "Meteorology source grid about 0.5° latitude × 0.625° longitude; API point is not a field sensor.",
    dates: ["2018-01-01", "2024-12-31"],
    status: "genuine cached observation",
    days: weather,
  }),
);
await writeFile(`${dir}/provenance.json`, JSON.stringify(provenance, null, 2));
console.log("Weather cache complete. Run scripts/fetch-hls.py for vegetation.");
