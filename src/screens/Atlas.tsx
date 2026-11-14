import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Globe2,
  MapPin,
  Leaf,
  Droplets,
  Plus,
  Minus,
  Layers,
  RotateCcw,
} from "lucide-react";
import { asset, cropAsset } from "../config";
import LocationSearch from "../components/LocationSearch";
import CropProfile from "../components/CropProfile";
import {
  ATLAS_CROPS,
  broadFit,
  FIT_COLORS,
  ZONES,
  zoneAt,
  type AtlasCropId,
  type SoilType,
} from "../data/atlas";
type ClimateGrid = {
  width: number;
  height: number;
  values: number[];
  period: string;
  support: string;
  source: string;
  license: string;
  attribution: string;
  retrieved: string;
};
const GROUP_COLORS = ["#dbe8d4", "#d4b47d", "#87a897", "#8ba8bc", "#b9bec8"];
export default function Atlas({
  onUseLocation,
}: {
  onUseLocation: (lat: number, lon: number) => void;
}) {
  const [data, setData] = useState<ClimateGrid | null>(null);
  const [err, setErr] = useState("");
  const [crop, setCrop] = useState<AtlasCropId>("wheat");
  const [soil, setSoil] = useState<SoilType>("unknown");
  const [irrigated, setIrrigated] = useState(false);
  const [mode, setMode] = useState("climate");
  const [point, setPoint] = useState({ lat: 32.1, lon: 73 });
  const [zoom, setZoom] = useState(1);
  const [opacity, setOpacity] = useState(55);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const c = ATLAS_CROPS.find((x) => x.id === crop)!;
  const zone = data
    ? zoneAt(data.values, data.width, data.height, point.lat, point.lon)
    : 0;
  useEffect(() => {
    fetch(asset("data/climate-zones.json"))
      .then((r) => {
        if (!r.ok) throw Error("Climate cache unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !data) return;
    el.width = data.width;
    el.height = data.height;
    const ctx = el.getContext("2d")!;
    const img = ctx.createImageData(data.width, data.height);
    data.values.forEach((z, i) => {
      const group = z <= 3 ? 0 : z <= 7 ? 1 : z <= 16 ? 2 : z <= 28 ? 3 : 4;
      const col =
        z === 0
          ? "#eaf0ed"
          : mode === "climate"
            ? GROUP_COLORS[group]
            : FIT_COLORS[broadFit(crop, z, soil, irrigated).level];
      const rgb = col.match(/\w\w/g)!.map((v) => parseInt(v, 16));
      img.data.set([...rgb, z === 0 ? 0 : 255], i * 4);
    });
    ctx.putImageData(img, 0, 0);
  }, [data, crop, soil, mode, irrigated]);
  const pick = (lat: number, lon: number) =>
    setPoint({
      lat: Math.max(-89.75, Math.min(89.75, lat)),
      lon: Math.max(-179.75, Math.min(179.75, lon)),
    });
  return (
    <main className="atlas-page">
      <div className="atlas-heading">
        <div>
          <span className="eyebrow">
            <Globe2 size={15} /> THE CROP ATLAS
          </span>
          <h1>
            Different ground.
            <br />
            <em>Different possibilities.</em>
          </h1>
          <p>
            Explore the world's climate families, then see which crops are worth
            investigating—and what their soil and water conditions need.
          </p>
        </div>
        <div className="atlas-context">
          <span>GENUINE CLIMATE CLASSIFICATION</span>
          <strong>1991—2020</strong>
          <small>
            Köppen–Geiger · Beck et al. (2023)
            <br />
            0.5° historical map · CC BY 4.0
          </small>
        </div>
      </div>
      <LocationSearch
        onPick={(lat, lon) => {
          pick(lat, lon);
          document
            .getElementById("satellite-map")
            ?.scrollIntoView({ behavior: "instant", block: "start" });
        }}
      />
      <button
        className="map-jump"
        onClick={() =>
          document
            .getElementById("satellite-map")
            ?.scrollIntoView({ behavior: "instant", block: "start" })
        }
      >
        <MapPin size={16} />
        View the satellite map
      </button>
      <div className="atlas-controls">
        <div className="segmented">
          <button
            aria-pressed={mode === "climate"}
            onClick={() => setMode("climate")}
          >
            <Globe2 size={16} /> Climate families
          </button>
          <button
            aria-pressed={mode === "crop"}
            onClick={() => setMode("crop")}
          >
            <Leaf size={16} /> Crop climate fit
          </button>
        </div>
        <label>
          <span>
            <Leaf size={15} /> Explore a crop
          </span>
          <select
            aria-label="Atlas crop"
            value={crop}
            onChange={(e) => {
              setCrop(e.target.value as AtlasCropId);
              setMode("crop");
            }}
          >
            {ATLAS_CROPS.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            <Layers size={15} /> Illustrative soil filter
          </span>
          <select
            aria-label="Atlas soil filter"
            value={soil}
            onChange={(e) => setSoil(e.target.value as SoilType)}
          >
            <option value="unknown">Unknown / no soil data</option>
            <option value="sand">Sandy / low water retention</option>
            <option value="loam">Drained loam</option>
            <option value="clay">Clay / higher water retention</option>
            <option value="waterlogged">Persistently waterlogged</option>
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={irrigated}
            onChange={(e) => setIrrigated(e.target.checked)}
          />
          Assume irrigation access
        </label>
        <label className="overlay-opacity">
          Color overlay · {opacity}%
          <input
            aria-label="Overlay opacity"
            type="range"
            min="0"
            max="100"
            step="5"
            value={opacity}
            onChange={(e) => setOpacity(+e.target.value)}
          />
        </label>
      </div>
      {err && (
        <p role="alert" className="warning">
          {err}. The crop reference cards remain available; no global layer is
          invented.
        </p>
      )}
      <div className="atlas-layout">
        <section className="world-panel" id="satellite-map">
          <div className="map-header">
            <span>
              <span className="live-dot" />{" "}
              {mode === "climate"
                ? "CLIMATE FAMILIES"
                : "BROAD CROP CLIMATE SCREEN · PROVISIONAL"}
            </span>
            <span>Click / tap land · arrow keys move the marker</span>
          </div>
          <div
            className="world-map"
            role="application"
            aria-label="World climate map. Arrow keys move the selected location by two degrees."
            tabIndex={0}
            onKeyDown={(e) => {
              const d: { [k: string]: [number, number] } = {
                ArrowUp: [2, 0],
                ArrowDown: [-2, 0],
                ArrowLeft: [0, -2],
                ArrowRight: [0, 2],
              };
              if (d[e.key]) {
                e.preventDefault();
                pick(point.lat + d[e.key][0], point.lon + d[e.key][1]);
              }
            }}
          >
            <div
              className="map-world"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: `${((point.lon + 180) / 360) * 100}% ${((90 - point.lat) / 180) * 100}%`,
              }}
            >
              <img
                className="satellite-base"
                src={asset("images/blue-marble-2004-08.jpg")}
                alt="NASA Blue Marble satellite composite, August 2004"
                onError={() => setBasemapFailed(true)}
                style={{ display: basemapFailed ? "none" : "block" }}
              />
              <canvas
                ref={canvas}
                style={{ opacity: basemapFailed ? 1 : opacity / 100 }}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  pick(
                    90 - ((e.clientY - r.top) / r.height) * 180,
                    ((e.clientX - r.left) / r.width) * 360 - 180,
                  );
                }}
                aria-label="Historical Köppen climate raster"
              />
              <svg
                className="graticule"
                viewBox="0 0 720 360"
                aria-hidden="true"
              >
                {[60, 120, 180, 240, 300].map((y) => (
                  <path key={y} d={`M0 ${y}H720`} />
                ))}
                {[120, 240, 360, 480, 600].map((x) => (
                  <path key={x} d={`M${x} 0V360`} />
                ))}
              </svg>
              <span
                className="world-pin"
                style={{
                  left: `${((point.lon + 180) / 360) * 100}%`,
                  top: `${((90 - point.lat) / 180) * 100}%`,
                }}
              >
                <MapPin size={25} />
              </span>
            </div>
            <div className="map-zoom">
              <button
                aria-label="Zoom world map in"
                onClick={() => setZoom(Math.min(4, zoom + 0.5))}
              >
                <Plus size={15} />
              </button>
              <button
                aria-label="Zoom world map out"
                onClick={() => setZoom(Math.max(1, zoom - 0.5))}
              >
                <Minus size={15} />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  pick(32.1, 73);
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
          <div className="map-legend">
            {mode === "climate"
              ? ["Tropical", "Dry", "Temperate", "Continental", "Polar"].map(
                  (g, i) => (
                    <span key={g}>
                      <i style={{ background: GROUP_COLORS[i] }} />
                      {g}
                    </span>
                  ),
                )
              : [
                  "Outside preference / constraint",
                  "Season or water check",
                  "Promising climate family",
                ].map((g, i) => (
                  <span key={g}>
                    <i style={{ background: FIT_COLORS[i + 1] }} />
                    {g}
                  </span>
                ))}
          </div>
          <div className="map-presets">
            <span>Jump to context</span>
            {[
              ["Punjab", 32.1, 73],
              ["Corn belt", 41, -94],
              ["Sahel", 13, 1],
              ["SE Asia", 15, 101],
              ["Europe", 48, 10],
            ].map(([name, lat, lon]) => (
              <button key={name} onClick={() => pick(+lat, +lon)}>
                <MapPin size={13} /> {name}
              </button>
            ))}
          </div>
          <p className="note map-footnote">
            <strong>
              Satellite basemap: NASA Blue Marble · August 2004 composite.
            </strong>{" "}
            Not live imagery. Independent color overlay: 1991–2020 climate
            classes / provisional crop fit. Adjust opacity to reveal the
            satellite view. Actual climate classes; our muted palette groups the
            30 subclasses into five families. Equal-angle projection, no
            political boundaries. The selected soil is a hypothetical filter,
            not a global mapped soil layer. A coarse climate class cannot
            establish the best crop for a farm.
          </p>
          {basemapFailed && (
            <p className="note" role="status">
              Satellite image unavailable; the cached climate layer is still
              usable.
            </p>
          )}
        </section>
        <aside className="atlas-inspector">
          <span className="eyebrow">SELECTED CONTEXT</span>
          <h2>{ZONES[zone]?.[0] ?? "Unknown"}</h2>
          <h3>{ZONES[zone]?.[1] ?? "No classification"}</h3>
          <div className="atlas-coordinates">
            <label>
              Latitude
              <input
                aria-label="Atlas latitude"
                type="number"
                min="-89.75"
                max="89.75"
                step=".25"
                value={point.lat}
                onChange={(e) => pick(+e.target.value, point.lon)}
              />
            </label>
            <label>
              Longitude
              <input
                aria-label="Atlas longitude"
                type="number"
                min="-179.75"
                max="179.75"
                step=".25"
                value={point.lon}
                onChange={(e) => pick(point.lat, +e.target.value)}
              />
            </label>
          </div>
          <div className="soil-swatch" data-soil={soil}>
            <i />
            <i />
            <i />
            <span>
              {soil === "unknown" ? "Soil is unknown" : `Scenario: ${soil}`}
            </span>
          </div>
          <h4>Crop pathways to investigate</h4>
          <div className="atlas-candidates">
            {ATLAS_CROPS.map((c) => {
              const fit = broadFit(c.id, zone, soil, irrigated);
              return (
                <button
                  key={c.id}
                  aria-pressed={crop === c.id}
                  onClick={() => {
                    setCrop(c.id);
                    setMode("crop");
                  }}
                >
                  <img
                    className="crop-choice-art"
                    src={asset(`images/crops/${cropAsset(c.id)}-thumb.webp`)}
                    alt=""
                  />
                  <span>
                    {c.name}
                    <small>{fit.label}</small>
                  </span>
                  <i style={{ background: FIT_COLORS[fit.level] }} />
                </button>
              );
            })}
          </div>
          <button
            className="primary"
            onClick={() => onUseLocation(point.lat, point.lon)}
          >
            Use location in field setup <ArrowUpRight size={16} />
          </button>
          <p className="note">
            Matching weather is required after moving the pilot. Global atlas
            traits do not add a crop to the Punjab rotation registry
            automatically.
          </p>
        </aside>
      </div>
      <section className="atlas-detail">
        <div className="atlas-crop-art">
          <img
            className="atlas-plant-poster"
            src={asset(`images/crops/${cropAsset(crop)}.webp`)}
            alt={`Illustrative ${c.name} plant`}
          />
          <span>{c.latin}</span>
          <a className="text-action" href={`#/crops?crop=${crop}`}>
            Inspect the 3D plant <ArrowUpRight size={16} />
          </a>
        </div>
        <div>
          <span className="eyebrow">WHY {c.name.toUpperCase()}?</span>
          <h2>{c.name}, in context.</h2>
          <p className="atlas-fit">
            <i
              style={{
                background:
                  FIT_COLORS[broadFit(crop, zone, soil, irrigated).level],
              }}
            />
            {broadFit(crop, zone, soil, irrigated).label}
          </p>
          <p>{broadFit(crop, zone, soil, irrigated).reason}</p>
          <div className="three-notes">
            <article>
              <Globe2 size={19} />
              <h3>Climate</h3>
              <p>{c.climate}</p>
            </article>
            <article>
              <Leaf size={19} />
              <h3>Soil</h3>
              <p>{c.soil}</p>
            </article>
            <article>
              <Droplets size={19} />
              <h3>Water</h3>
              <p>{c.water}</p>
            </article>
          </div>
          <a href={c.source} target="_blank" rel="noreferrer">
            Crop adaptation reference <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
      <CropProfile crop={crop} />
      <details className="paper atlas-methods">
        <summary>What this map can—and cannot—tell you</summary>
        <p>
          The background is a genuine historical classification from Beck et al.
          (2023), not a crop-yield or soil suitability raster. Crop-fit colors
          are explicitly provisional qualitative mappings of climate classes to
          broad crop adaptations. They do not implement GAEZ, ECOCROP
          productivity, or numerical global crop ranking. Soil texture is
          selected by you; no laboratory/global soil measurement is inferred
          from the map. The same climate class can support different seasons,
          irrigation systems and varieties.
        </p>
        <p>
          “Promising” means an adaptation context worth investigating, not a
          recommendation or proof of feasibility. Desert water supply, cold
          summers, soil pH/salinity, drainage, growing-season length, water
          rights, crop variety, equipment, protected land and markets need
          separate evidence. Unknowns must stay unknown. Paddy rice is not
          ranked by the root-zone planner without its missing water terms.
          Mungbean mapping beyond the cited regional calendar is provisional.
        </p>
        <p>
          {data?.attribution} Source:{" "}
          <a href="https://doi.org/10.1038/s41597-023-02549-6">
            Scientific Data paper
          </a>
          ;{" "}
          <a href="https://doi.org/10.6084/m9.figshare.21789074">
            data archive
          </a>
          ; <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
          . Native provider 0.5° historical raster, retrieved 14 November 2026,
          recolored/grouped for this application. The original raster checksum,
          exact member and full classification legend are bundled in
          public/data.
        </p>
        <p>
          <a href="https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en">
            FAO ECOCROP context
          </a>
          : crop suitability needs environmental constraints beyond a climate
          family. No country boundary or sovereignty claim is shown.
        </p>
      </details>
    </main>
  );
}
export function CropGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 80 100" aria-hidden="true">
      <path
        d="M40 92Q34 50 43 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      {kind === "pulse" ? (
        <>
          <ellipse
            cx="25"
            cy="49"
            rx="16"
            ry="9"
            transform="rotate(30 25 49)"
            fill="currentColor"
            opacity=".65"
          />
          <ellipse
            cx="54"
            cy="32"
            rx="16"
            ry="9"
            transform="rotate(-30 54 32)"
            fill="currentColor"
            opacity=".8"
          />
          <path
            d="M43 48Q75 50 55 78Q41 77 43 48"
            fill="currentColor"
            opacity=".4"
          />
        </>
      ) : kind === "maize" ? (
        <>
          <path
            d="M39 79Q-2 64 13 34Q44 50 39 79M42 70Q79 48 69 25Q43 37 42 70"
            fill="currentColor"
            opacity=".7"
          />
          <ellipse cx="41" cy="42" rx="9" ry="22" fill="currentColor" />
        </>
      ) : (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(0 ${i * 10})`}>
              <ellipse
                cx="33"
                cy="19"
                rx="5"
                ry="10"
                transform="rotate(-35 33 19)"
                fill="currentColor"
                opacity=".8"
              />
              <ellipse
                cx="48"
                cy="15"
                rx="5"
                ry="10"
                transform="rotate(35 48 15)"
                fill="currentColor"
                opacity=".65"
              />
            </g>
          ))}
          <path
            d="M40 84Q17 73 17 62M42 73Q64 65 65 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}
