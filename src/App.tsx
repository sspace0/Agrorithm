import { observationDates } from "./state/observationDates";
import { formatNumber } from "./engine/format";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Leaf,
  MapPin,
  Droplets,
  ChevronRight,
  Check,
  Download,
  Save,
  Trash2,
  FlaskConical,
  Globe2,
  Sprout,
  Wind,
  BarChart3,
  Info,
  ExternalLink,
  CloudRain,
  Printer,
  Upload,
  Layers,
  Settings2,
  ChevronDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { BRAND, MEMBERS, MODEL_VERSION, asset, cropAsset } from "./config";
import { Diorama } from "./components/Diorama";
import HomeExperience from "./screens/HomeExperience";
import Help from "./screens/Help";
import WeatherPatterns from "./screens/WeatherPatterns";
import AgrorithmHelper from "./components/AgrorithmHelper";
import NavigationSearch from "./components/NavigationSearch";
import FindFarmLocation from "./components/FindFarmLocation";
import BootOverlay from "./components/BootOverlay";
import AgrorithmReport, {
  printAgrorithmReport,
} from "./report/AgrorithmReport";
import CropLibrary from "./screens/CropLibrary";
import CropInterestPicker from "./components/CropInterestPicker";
import { withCropInterest } from "./engine/cropInterest";
import Atlas from "./screens/Atlas";
import {
  compare,
  DEFAULT_SCENARIO,
  daysBetween,
  sensitivity,
  sequence,
} from "./engine/engine";
import {
  parseCropTable,
  parseWeather,
  validateFarm,
  validateScenario,
} from "./engine/import";
import { CROPS } from "./data/crops";
import { SAMPLE, EMPTY } from "./data/sample";
import type { CropId, Day, Farm, Result, Scenario } from "./engine/types";
type Concept = "studio" | "console" | "companion";
type Vegetation = {
  publisher: string;
  product: string;
  version: string;
  doi: string;
  quality: string;
  note: string;
  retrieved: string;
  spatialSupport: {
    pixelSizeM: number;
    shape: number[];
    coordinates: number[][][];
  };
  observations: {
    date: string;
    ndvi: number | null;
    validPixels: number;
    totalPixels: number;
    coverage: number;
    item: string;
    source: string;
  }[];
  failures: { item: string; reason: string }[];
};
const STEPS = ["setup", "evidence", "lab", "scenarios", "tradeoffs", "export"];
const LABELS: Record<string, string> = {
  setup: "Your field",
  evidence: "The evidence",
  lab: "Rotation lab",
  scenarios: "What if?",
  tradeoffs: "Trade-offs",
  export: "Your plan",
};
const URDU: Record<string, string> = {
  setup: "آپ کا کھیت",
  evidence: "شواہد",
  lab: "فصلوں کی ترتیب",
  scenarios: "اگر ایسا ہو؟",
  tradeoffs: "موازنہ",
  export: "آپ کا منصوبہ",
};
const rounded = (n: number | null, suffix = "") =>
  n === null ? "Unknown" : `${Math.round(n).toLocaleString()}${suffix}`;
const clone = <T,>(x: T): T => structuredClone(x);
function storedSession<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function stored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function download(name: string, body: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function IconText({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}
export default function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  const [farm, setFarm] = useState<Farm>(() => {
    try {
      return validateFarm(
        stored<{ farm: Farm } | null>("fieldshift-plan", null)?.farm,
      );
    } catch {
      return clone(SAMPLE);
    }
  });
  const [scenario, setScenario] = useState<Scenario>(() => {
    try {
      return validateScenario(
        stored<{ scenario: Scenario } | null>("fieldshift-plan", null)
          ?.scenario,
      );
    } catch {
      return clone(DEFAULT_SCENARIO);
    }
  });
  const [lang] = useState("en");
  const [motion, setMotion] = useState(
    !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [quality, setQuality] = useState(stored("fieldshift-quality", "auto"));
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => setSettingsOpen(false), [route]);
  useEffect(() => {
    if (!settingsOpen) return;
    const close = (event: PointerEvent) => {
      if (
        !(event.target as Element).closest(
          ".display-controls,.mobile-settings-trigger",
        )
      )
        setSettingsOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [settingsOpen]);
  const concept: Concept = "studio";
  const [weather, setWeather] = useState<Day[]>([]);
  const [veg, setVeg] = useState<Vegetation | null>(null);
  const [weatherSource, setWeatherSource] = useState(
    "NASA POWER · genuine cached observation · UTC · 2018–2024",
  );
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(() => !!stored("fieldshift-plan", null));
  const [loading, setLoading] = useState(true);
  const [loadSteps, setLoadSteps] = useState(0);
  const [latitudeData, setLatitudeData] = useState(32.1);
  const [longitudeData, setLongitudeData] = useState(73);
  const say = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 4500);
  };
  useEffect(() => {
    const onhash = () => {
      const update = () => {
        flushSync(() => setRoute(location.hash.slice(1) || "/"));
        window.scrollTo(0, 0);
      };
      if (
        motion &&
        document.startViewTransition &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const transition = document.startViewTransition(update);
        // Rapid navigation can skip the visual transition while its DOM update succeeds.
        void transition.ready.catch(() => undefined);
      }
      else update();
    };
    addEventListener("hashchange", onhash);
    return () => removeEventListener("hashchange", onhash);
  }, [motion]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    localStorage.setItem("fieldshift-lang", JSON.stringify(lang));
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("fieldshift-quality", JSON.stringify(quality));
  }, [quality]);
  useEffect(() => {
    Promise.allSettled([
      fetch(asset("data/weather.json"))
        .then((r) => {
          if (!r.ok) throw Error("Weather cache unavailable");
          return r.text();
        })
        .then((t) => setWeather(parseWeather(t)))
        .finally(() => setLoadSteps((n) => Math.min(2, n + 1))),
      fetch(asset("data/vegetation.json"))
        .then((r) => {
          if (!r.ok) throw Error("Vegetation cache unavailable");
          return r.json();
        })
        .then(setVeg)
        .finally(() => setLoadSteps((n) => Math.min(2, n + 1))),
    ]).then((rs) => {
      const errors = rs.flatMap((r) =>
        r.status === "rejected" ? [String(r.reason)] : [],
      );
      setError(errors.join(" · "));
      setLoading(false);
    });
  }, []);
  const aligned =
    Math.abs(farm.lat - latitudeData) < 0.001 &&
    Math.abs(farm.lon - longitudeData) < 0.001;
  const results = useMemo(
    () => compare(farm, aligned ? weather : [], scenario),
    [farm, weather, scenario, aligned],
  );
  const parts = route.split("?")[0].split("/").filter(Boolean);
  const currentConcept = (
    ["studio", "console", "companion"].includes(parts[0]) ? parts[0] : concept
  ) as Concept;
  const page = parts[1] || "setup";
  const navigate = (path: string) => {
    location.hash = path;
  };
  const start = (sample: boolean, c: Concept = concept) => {
    setFarm(clone(sample ? SAMPLE : EMPTY));
    setScenario(clone(DEFAULT_SCENARIO));
    navigate(`/${c}/${sample ? "lab" : "setup"}`);
  };
  function save() {
    try {
      localStorage.setItem(
        "fieldshift-plan",
        JSON.stringify({
          schema: 1,
          modelVersion: MODEL_VERSION,
          farm,
          scenario,
          saved: new Date().toISOString(),
        }),
      );
      setSaved(true);
      say("Plan saved on this device.");
    } catch {
      say("Device storage is unavailable. Export JSON to keep your plan.");
    }
  }
  function deletePlan() {
    localStorage.removeItem("fieldshift-plan");
    setSaved(false);
    say("Saved plan deleted from this device.");
  }
  const controls = (
    <div className="global-controls">
      <button
        aria-pressed={!motion}
        onClick={() => setMotion(!motion)}
        title="Reduced motion"
      >
        <Wind size={15} />
        <span>{motion ? "Motion on" : "Reduced motion"}</span>
      </button>
      <label className="quality-control">
        <Layers size={16} aria-hidden="true" />
        <select
          aria-label="Graphics quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
        >
          <option value="auto">3D · Balanced</option>
          <option value="low">3D · Lighter</option>
          <option value="static">Poster only</option>
        </select>
        <ChevronDown size={14} className="quality-chevron" aria-hidden="true" />
      </label>
    </div>
  );
  const header = (
    <header className="site-header">
      <a className="wordmark" href="#/" aria-label={`${BRAND.name} home`}>
        <img
          className="brand-logo"
          src={asset("images/agrorithm-logo.png")}
          alt={BRAND.name}
        />
        <span className="beta">PUNJAB PILOT</span>
      </a>
      <nav className="top-links">
        <a href={`#/${concept}/setup`}>Plan</a>
        <a href="#/atlas">Map</a>
        <a href="#/soil">3D explorer</a>
        <a href="#/help">Help</a>
      </nav>
      <NavigationSearch />
      <button
        className="mobile-settings-trigger"
        aria-expanded={settingsOpen}
        aria-label="Display settings"
        aria-controls="display-controls"
        onClick={() => setSettingsOpen(!settingsOpen)}
      >
        <Settings2 size={18} />
      </button>
      <div
        className={`display-controls ${settingsOpen ? "is-open" : ""}`}
        id="display-controls"
      >
        {controls}
      </div>
    </header>
  );
  const home = (
    <HomeExperience
      motion={motion}
      quality={quality}
      lang={lang}
      saved={saved}
      start={start}
      resume={() => {
        const v = stored<{ farm: Farm; scenario: Scenario }>(
          "fieldshift-plan",
          { farm: SAMPLE, scenario: DEFAULT_SCENARIO },
        );
        try {
          setFarm(validateFarm(v.farm));
          setScenario(validateScenario(v.scenario));
          navigate(`/${concept}/lab`);
        } catch {
          say("Saved plan could not be restored. Import a valid JSON plan.");
        }
      }}
    />
  );
  const appData = {
    farm,
    setFarm,
    scenario,
    setScenario,
    weather,
    results,
    veg,
    say,
    weatherSource,
    setWeather,
    setWeatherSource,
    setLatitudeData,
    setLongitudeData,
    dataLat: latitudeData,
    dataLon: longitudeData,
    aligned,
  };
  const panel =
    page === "setup" ? (
      <Setup {...appData} />
    ) : page === "evidence" ? (
      <Evidence {...appData} />
    ) : page === "lab" ? (
      <Lab {...appData} />
    ) : page === "scenarios" ? (
      <Scenarios {...appData} />
    ) : page === "tradeoffs" ? (
      <Tradeoffs {...appData} />
    ) : page === "export" ? (
      <Export {...appData} save={save} deletePlan={deletePlan} />
    ) : (
      <p>
        Page not found.{" "}
        <a href={`#/${currentConcept}/setup`}>Open field setup</a>
      </p>
    );
  const workspace = (
    <div className={`workspace concept-${currentConcept}`}>
      <aside className="workspace-nav">
        <div className="workspace-name">
          <Leaf size={19} />
          <span>
            {currentConcept === "studio"
              ? "Field Studio"
              : currentConcept === "console"
                ? "Agronomist Console"
                : "Farmer Companion"}
          </span>
        </div>
        <nav aria-label="Planning steps">
          {STEPS.map((s, i) => (
            <a
              key={s}
              href={`#/${currentConcept}/${s}`}
              aria-current={page === s ? "step" : undefined}
            >
              <span className="step-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              {lang === "ur" ? URDU[s] : LABELS[s]}
              <ChevronRight size={14} />
            </a>
          ))}
        </nav>
        <div className="nav-bottom">
          <span>
            <MapPin size={14} />
            {farm.lat.toFixed(2)}° N · {farm.lon.toFixed(2)}° E
          </span>
          <button onClick={save}>
            <Save size={16} /> Save locally
          </button>
          <a href="#/soil">
            Soil explorer <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <main className="workspace-main" id="main">
        <div className="workspace-top">
          <a href="#/">
            <ArrowLeft size={14} /> Home
          </a>
          <span>JUL 2021 — JUN 2024 · 36 MONTHS</span>
          <button
            className="small-button"
            onClick={() => start(true, currentConcept)}
          >
            Load sample
          </button>
        </div>
        {currentConcept === "companion" && (
          <div className="companion-progress">
            STEP {STEPS.indexOf(page) + 1} OF 6{" "}
            <progress value={STEPS.indexOf(page) + 1} max="6" />
          </div>
        )}
        <div className="page-heading">
          <div>
            <IconText>
              {currentConcept === "console"
                ? "EVIDENCE WORKSPACE"
                : "YOUR NEXT THREE YEARS"}
            </IconText>
            <h1>{lang === "ur" ? URDU[page] : LABELS[page]}</h1>
          </div>
          <span className="field-chip">
            <MapPin size={15} />
            {farm.name}
          </span>
        </div>
        {lang === "ur" && (
          <p className="translation-note">
            یہ ابتدائی ترجمہ ہے۔ مقامی ماہر سے تصدیق کریں۔{" "}
            <span lang="en">
              Urdu guidance is provisional and needs fluent review; technical
              detail remains in English.
            </span>
          </p>
        )}
        {!aligned && (
          <div role="alert" className="warning">
            Cached observations are for 32.10° N, 73.00° E. This field has
            moved; calculations remain unresolved until matching weather is
            imported or fetched.
          </div>
        )}
        {loading && (
          <p role="status">
            Loading cached observations… Field inputs are available now.
          </p>
        )}
        {error && (
          <div className="warning" role="alert">
            {error}. Import matching data in Evidence; planning remains
            available.
          </div>
        )}
        <div className="panel-content">{panel}</div>
        {currentConcept === "console" && (
          <div className="console-inspector">
            <Diorama compact motion={motion} quality={quality} />
            <p>
              Illustrative root geometry · no inferred soil carbon or water
              table.
            </p>
          </div>
        )}
        <div className="step-footer">
          {STEPS.indexOf(page) > 0 && (
            <a
              className="secondary"
              href={`#/${currentConcept}/${STEPS[STEPS.indexOf(page) - 1]}`}
            >
              <ArrowLeft size={16} /> Back
            </a>
          )}
          {STEPS.indexOf(page) < 5 && (
            <a
              className="primary"
              href={`#/${currentConcept}/${STEPS[STEPS.indexOf(page) + 1]}`}
            >
              Continue <ArrowRight size={17} />
            </a>
          )}
        </div>
      </main>
    </div>
  );
  return (
    <div
      className={`app ${parts[0] === "atlas" ? "atlas-route" : ""} ${motion ? "" : "reduced-motion"} ${route === "/" ? "home-route" : ""}`}
    >
      <BootOverlay
        dataSteps={loadSteps}
        initialRoute={route}
        quality={quality}
      />
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.querySelector("main");
          main?.setAttribute("tabindex", "-1");
          main?.focus();
        }}
      >
        Skip to content
      </a>
      {header}
      {loading && (
        <div
          className="dataset-loading"
          role="progressbar"
          aria-label="Preparing cached NASA observations"
          aria-valuenow={loadSteps}
          aria-valuemin={0}
          aria-valuemax={2}
        >
          <i style={{ width: `${loadSteps * 50}%` }} />
          <div className="dataset-loading-label">
            <img src={asset("images/agrorithm-logo.png")} alt={BRAND.name} />
            Checking observations · {loadSteps}/2
          </div>
        </div>
      )}
      {route === "/" ? (
        home
      ) : parts[0] === "atlas" ? (
        <Atlas
          onUseLocation={(lat, lon, coordinateEvidence) => {
            setFarm({ ...farm, lat, lon, coordinateEvidence });
            navigate(`/${concept}/setup`);
          }}
        />
      ) : parts[0] === "soil" ? (
        <main className="standalone soil-page">
          <a href="#/">← Back to the field</a>
          <IconText>FOLLOW THE WATER</IconText>
          <h1>
            There is more
            <br />
            <em>beneath the surface.</em>
          </h1>
          <p className="lede">
            Roots, soil and groundwater are connected. Their scales—and the
            evidence needed to understand them—are different.
          </p>
          <nav className="soil-subnav" aria-label="3D explorer pages">
            <a href="#/soil" aria-current="page">
              <Layers size={16} />
              Soil & water
            </a>
            <a href="#/crops">
              <Sprout size={16} />
              Crop models
            </a>
          </nav>
          <Diorama
            explorer
            motion={motion}
            quality={quality}
            rain={scenario.rainFactor}
          />
          <div className="evidence-strip">
            <Metric
              name="Historical replay · baseline net irrigation"
              value={rounded(results[0].netIrrigation, " mm")}
            />
            <Metric
              name="Modeled final root-zone storage"
              value={rounded(results[0].finalStorage, " mm")}
            />
            <Metric
              name="Hypothetical rainfall setting"
              value={`${Math.round(scenario.rainFactor * 100)}% of history`}
            />
          </div>
          <div className="three-notes">
            <article>
              <Droplets />
              <h3>Measured inputs</h3>
              <p>
                No measured soil profile or water-table depth is supplied for
                this pilot. Local tests take priority.
              </p>
            </article>
            <article>
              <FlaskConical />
              <h3>Modeled scenarios</h3>
              <p>
                The planning model screens a root-zone bucket. It does not
                simulate aquifer recharge or groundwater movement.
              </p>
            </article>
            <article>
              <Info />
              <h3>Illustrative geometry</h3>
              <p>
                Layer depths, crop roots and water-table control explain
                processes. SMAP and GRACE are not used to infer field depth.
              </p>
            </article>
          </div>
        </main>
      ) : parts[0] === "sources" ? (
        <Sources />
      ) : parts[0] === "about" ? (
        <About />
      ) : parts[0] === "design" ? (
        <DesignReview start={(c) => start(true, c)} />
      ) : parts[0] === "help" ? (
        <Help key={route} />
      ) : parts[0] === "weather-patterns" ? (
        <WeatherPatterns />
      ) : parts[0] === "crops" ? (
        <CropLibrary motion={motion} quality={quality} key={route} onPlanCrop={crop => {
          setFarm(current => withCropInterest(current, crop));
          location.hash = "#/studio/setup";
        }} />
      ) : (
        workspace
      )}
      <AgrorithmHelper />
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {page === "export" && (
        <AgrorithmReport
          farm={farm}
          scenario={scenario}
          results={results}
          weatherSource={weatherSource}
          weather={weather}
          veg={veg}
          modelVersion={MODEL_VERSION}
          weatherCoordinates={{
            lat: latitudeData,
            lon: longitudeData,
            matching: aligned,
          }}
          uiSnapshot={{
            route,
            language: "English",
            quality,
            motion,
            atlas: JSON.stringify(storedSession("agrorithm-atlas", {})),
            cropReference: storedSession("agrorithm-crop", "maize"),
            evidence: JSON.stringify(
              storedSession("agrorithm-evidence-filter", {}),
            ),
          }}
        />
      )}
    </div>
  );
}
type DataProps = {
  farm: Farm;
  setFarm: (f: Farm) => void;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  weather: Day[];
  results: Result[];
  veg: Vegetation | null;
  say: (s: string) => void;
  weatherSource: string;
  setWeather: (w: Day[]) => void;
  setWeatherSource: (s: string) => void;
  setLatitudeData: (n: number) => void;
  setLongitudeData: (n: number) => void;
  aligned: boolean;
  dataLat: number;
  dataLon: number;
};
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder="Unknown"
        onChange={(e) => {
          const n = e.target.value === "" ? null : +e.target.value;
          if (
            n === null ||
            (Number.isFinite(n) &&
              (min === undefined || n >= min) &&
              (max === undefined || n <= max))
          )
            onChange(n);
        }}
      />
    </label>
  );
}
function Setup({ farm: f, setFarm }: DataProps) {
  const patch = (p: Partial<Farm>) => setFarm({ ...f, ...p });
  const soil = (p: Partial<Farm["soil"]>) =>
    patch({ soil: { ...f.soil, ...p } });
  const [acres, setAcres] = useState(false);
  return (
    <>
      <div className="section-intro">
        <h2>Every field is a little different.</h2>
        <p>
          Start with what you know. Leave the rest unknown. The example’s soil
          and management values are assumptions, not field measurements.
        </p>
      </div>
      <CropInterestPicker farm={f} onChange={setFarm} />
      <div className="setup-grid">
        <section className="paper">
          <h3>
            <MapPin size={18} /> Place & scale
          </h3>
          <FindFarmLocation
            selectionKey={`${f.lat}/${f.lon}`}
            evidence={f.coordinateEvidence}
            onPick={(lat, lon, coordinateEvidence) =>
              patch({ lat, lon, coordinateEvidence })
            }
          />
          <label>
            Field name
            <input
              value={f.name}
              maxLength={100}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <div className="form-row">
            <NumberField
              label="Latitude (°)"
              value={f.lat}
              min={-90}
              max={90}
              step={0.0001}
              onChange={(n) =>
                n !== null && patch({ lat: n, coordinateEvidence: undefined })
              }
            />
            <NumberField
              label="Longitude (°)"
              value={f.lon}
              min={-180}
              max={180}
              step={0.0001}
              onChange={(n) =>
                n !== null && patch({ lon: n, coordinateEvidence: undefined })
              }
            />
          </div>
          <div className="coordinate-map" aria-label="Regional locator">
            <span className="map-grid" />
            <span className="map-label">PUNJAB · PAKISTAN</span>
            <MapPin size={30} />
            <small>
              {f.lat.toFixed(2)}° N, {f.lon.toFixed(2)}° E
            </small>
            <span className="map-disclaimer">
              Schematic locator · manual coordinates are authoritative
            </span>
          </div>
          <div className="form-row">
            <NumberField
              label={`Area (${acres ? "acres" : "hectares"})`}
              value={+(f.areaHa * (acres ? 2.47105 : 1)).toFixed(2)}
              min={0.001}
              step={0.01}
              onChange={(n) =>
                n !== null && patch({ areaHa: n / (acres ? 2.47105 : 1) })
              }
            />
            <button
              onClick={() => setAcres(!acres)}
              className="small-button unit-toggle"
            >
              Use {acres ? "hectares" : "acres"}
            </button>
          </div>
          <details>
            <summary>Optional boundary · GeoJSON</summary>
            <textarea
              aria-label="Optional GeoJSON polygon"
              value={f.polygon}
              onChange={(e) => patch({ polygon: e.target.value })}
              placeholder='{"type":"Polygon","coordinates":[…]}'
            />
            <p className="note">
              Stored/exported as supplied. Current weather is point-grid
              context; polygon does not change its resolution.
            </p>
          </details>
        </section>
        <section className="paper">
          <h3>
            <Droplets size={18} /> Water & soil
          </h3>
          <label>
            <span className="selector-art">
              <Droplets size={16} />
              Irrigation method
            </span>
            <select
              value={f.irrigation}
              onChange={(e) => patch({ irrigation: e.target.value })}
            >
              {["unknown", "surface", "sprinkler", "drip", "rainfed"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <div className="form-row">
            <NumberField
              label="Delivered limit · mm / 36 months"
              value={f.waterLimitMm}
              min={0}
              onChange={(n) => patch({ waterLimitMm: n })}
            />
            <NumberField
              label="Delivery efficiency · fraction"
              value={f.efficiency}
              min={0.01}
              max={1}
              step={0.01}
              onChange={(n) => patch({ efficiency: n })}
            />
          </div>
          <p className="note">
            1 mm over 1 ha = 10 m³. Method does not set efficiency
            automatically. Rainfed requires a zero irrigation limit.
          </p>
          <div className="form-row">
            <NumberField
              label="Soil pH · water suspension"
              value={f.soil.ph}
              min={0}
              max={14}
              step={0.1}
              onChange={(n) => soil({ ph: n })}
            />
            <NumberField
              label="EC · dS/m (method needed)"
              value={f.soil.ec}
              min={0}
              step={0.1}
              onChange={(n) => soil({ ec: n })}
            />
          </div>
          <div className="form-row">
            <NumberField
              label="Available storage · mm in root zone"
              value={f.soil.capacityMm}
              min={1}
              onChange={(n) => soil({ capacityMm: n })}
            />
            <NumberField
              label="Sampling/root-zone depth · cm"
              value={f.soil.depthCm}
              min={1}
              onChange={(n) => soil({ depthCm: n })}
            />
          </div>
          <label>
            Texture / test method
            <input
              value={f.soilTexture}
              onChange={(e) => patch({ soilTexture: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label>
              Sampling date
              <input
                type="date"
                value={f.soil.date}
                onChange={(e) => soil({ date: e.target.value })}
              />
            </label>
            <label>
              Soil source
              <input
                value={f.soil.source}
                onChange={(e) => soil({ source: e.target.value })}
                placeholder="Lab, farmer, modeled, or unknown"
              />
            </label>
          </div>
        </section>
      </div>
      <section className="paper">
        <h3 id="field-sequence" tabIndex={-1}>
          <Sprout size={18} /> Your existing crop sequence
        </h3>
        <p>
          Enter real sowing and harvest/termination dates within 1 July 2021–30
          June 2024. A seven-day transition buffer is enforced. Sample dates are
          demonstration assumptions.
        </p>
        <div className="sequence-editor">
          {f.sequence.map((p, i) => (
            <div className="sequence-row" key={i}>
              <label>
                <span className="selector-art">
                  <img
                    src={asset(`images/crops/${cropAsset(p.crop)}-thumb.webp`)}
                    alt=""
                  />
                  Crop
                </span>
                <select
                  value={p.crop}
                  onChange={(e) =>
                    patch({
                      sequence: f.sequence.map((v, j) =>
                        j === i ? { ...v, crop: e.target.value as CropId } : v,
                      ),
                    })
                  }
                >
                  {Object.values(CROPS).map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sown
                <input
                  type="date"
                  value={p.sow}
                  onChange={(e) => {
                    if (e.target.value)
                      patch({
                        sequence: f.sequence.map((v, j) =>
                          j === i ? { ...v, sow: e.target.value } : v,
                        ),
                      });
                  }}
                />
              </label>
              <label>
                Harvest / terminate
                <input
                  type="date"
                  value={p.harvest}
                  onChange={(e) => {
                    if (e.target.value)
                      patch({
                        sequence: f.sequence.map((v, j) =>
                          j === i ? { ...v, harvest: e.target.value } : v,
                        ),
                      });
                  }}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={p.residue}
                  onChange={(e) =>
                    patch({
                      sequence: f.sequence.map((v, j) =>
                        j === i ? { ...v, residue: e.target.checked } : v,
                      ),
                    })
                  }
                />{" "}
                Retain residue
              </label>
              <button
                aria-label={`Remove crop ${i + 1}`}
                onClick={() =>
                  patch({ sequence: f.sequence.filter((_, j) => j !== i) })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="secondary"
          onClick={() =>
            patch({
              sequence: [
                ...f.sequence,
                {
                  crop: "maize",
                  sow: "2021-07-20",
                  harvest: "2021-10-28",
                  residue: true,
                },
              ],
            })
          }
        >
          + Add crop
        </button>{" "}
        <button
          className="text-action"
          onClick={() => patch({ sequence: sequence("baseline") })}
        >
          Use demonstration maize–wheat dates
        </button>
      </section>
      <section className="paper">
        <h3>Practical constraints</h3>
        <div className="three-cols">
          <fieldset>
            <legend>Equipment access</legend>
            {["drill", "planter", "paddy"].map((v) => (
              <label className="check-label" key={v}>
                <input
                  type="checkbox"
                  checked={f.equipment.includes(v)}
                  onChange={(e) =>
                    patch({
                      equipment: e.target.checked
                        ? [...f.equipment, v]
                        : f.equipment.filter((x) => x !== v),
                    })
                  }
                />
                {v}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Market access</legend>
            {["grain", "pulses", "rice"].map((v) => (
              <label className="check-label" key={v}>
                <input
                  type="checkbox"
                  checked={f.markets.includes(v)}
                  onChange={(e) =>
                    patch({
                      markets: e.target.checked
                        ? [...f.markets, v]
                        : f.markets.filter((x) => x !== v),
                    })
                  }
                />
                {v}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Exclude crops</legend>
            {(["maize", "wheat", "mung", "cover", "rice"] as CropId[]).map(
              (v) => (
                <label className="check-label" key={v}>
                  <input
                    type="checkbox"
                    checked={f.exclusions.includes(v)}
                    onChange={(e) =>
                      patch({
                        exclusions: e.target.checked
                          ? [...f.exclusions, v]
                          : f.exclusions.filter((x) => x !== v),
                      })
                    }
                  />
                  {CROPS[v].name}
                </label>
              ),
            )}
          </fieldset>
        </div>
        <NumberField
          label="Known budget · PKR (optional; no economics computed)"
          min={0}
          value={f.budget}
          onChange={(n) => patch({ budget: n })}
        />
        <label>
          Farmer observations
          <textarea
            value={f.observations}
            onChange={(e) => patch({ observations: e.target.value })}
            placeholder="Residue, waterlogging, crop performance, access constraints…"
          />
        </label>
        <label className="check-label confirmation">
          <input
            type="checkbox"
            checked={f.confirmed}
            onChange={(e) => patch({ confirmed: e.target.checked })}
          />{" "}
          I confirm the entered rotation and management inputs for this
          screening case. The sample checks this only as a demonstration.
        </label>
      </section>
    </>
  );
}
function Evidence(p: DataProps) {
  const {
    farm,
    weather,
    veg,
    setWeather,
    setWeatherSource,
    setLatitudeData,
    setLongitudeData,
    say,
    weatherSource,
  } = p;
  const [busy, setBusy] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [importLat, setImportLat] = useState(farm.lat);
  const [importLon, setImportLon] = useState(farm.lon);
  const availableStart = weather[0]?.date || "",
    availableEnd = weather.at(-1)?.date || "";
  const initialFilter = storedSession("agrorithm-evidence-filter", {
    start: "",
    end: "",
  });
  const [requestedFrom, setDateFrom] = useState(initialFilter.start),
    [requestedTo, setDateTo] = useState(initialFilter.end);
  const { from: dateFrom, to: dateTo } = observationDates(
    requestedFrom,
    requestedTo,
    availableStart,
    availableEnd,
  );
  const [requestEnd, setRequestEnd] = useState(2024),
    [requestYear, setRequestYear] = useState<number | null>(null);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "agrorithm-evidence-filter",
        JSON.stringify({
          start: dateFrom || availableStart,
          end: dateTo || availableEnd,
        }),
      );
    } catch {
      /* Filters remain usable when session storage is unavailable. */
    }
  }, [dateFrom, dateTo, availableStart, availableEnd]);
  const filteredWeather = useMemo(
    () =>
      weather.filter(
        (d) =>
          (!dateFrom || d.date >= dateFrom) && (!dateTo || d.date <= dateTo),
      ),
    [weather, dateFrom, dateTo],
  );
  const monthly = useMemo(() => {
    const m = new Map<
      string,
      { date: string; rain: number; max: number; count: number }
    >();
    for (const d of filteredWeather) {
      const k = d.date.slice(0, 7);
      const row = m.get(k) || { date: k, rain: 0, max: 0, count: 0 };
      if (d.rain !== null && d.max !== null) {
        row.rain += d.rain;
        row.max += d.max;
        row.count++;
      }
      m.set(k, row);
    }
    return [...m.values()].map((d) => ({
      ...d,
      max: d.count ? d.max / d.count : null,
    }));
  }, [filteredWeather]);
  async function live() {
    setBusy(true);
    setLiveError("");
    try {
      const days: Day[] = [];
      for (let year = 2018; year <= requestEnd; year++) {
        setRequestYear(year);
        const q = new URLSearchParams({
          parameters: "T2M_MIN,T2M_MAX,PRECTOTCORR",
          community: "AG",
          longitude: String(farm.lon),
          latitude: String(farm.lat),
          start: `${year}0101`,
          end: `${year}1231`,
          format: "JSON",
          "time-standard": "UTC",
        });
        const r = await fetch(
          `https://power.larc.nasa.gov/api/temporal/daily/point?${q}`,
          { signal: AbortSignal.timeout(25000) },
        );
        if (!r.ok)
          throw Error(
            `Provider returned ${r.status}; no partial series applied.`,
          );
        const raw = await r.json();
        const v = raw.properties.parameter;
        for (const key of Object.keys(v.T2M_MIN)) {
          const clean = (n: number) => (n === -999 ? null : n);
          days.push({
            date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`,
            min: clean(v.T2M_MIN[key]),
            max: clean(v.T2M_MAX[key]),
            rain: clean(v.PRECTOTCORR[key]),
          });
        }
      }
      setWeather(parseWeather(JSON.stringify(days)));
      setLatitudeData(farm.lat);
      setLongitudeData(farm.lon);
      setWeatherSource(
        `NASA POWER · verified historical response · observations ${days[0]?.date}–${days.at(-1)?.date} · UTC · retrieved ${new Date().toISOString()}`,
      );
      setDateFrom("");
      setDateTo("");
      say("Historical weather updated from NASA.");
    } catch (e) {
      setLiveError(
        `${String(e)} Cached data remains available for its original coordinates.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-intro">
        <h2>A clear view of what we know.</h2>
        <p>
          Observations describe the past. Proposed rotations describe
          possibilities. Keep those two stories separate.
        </p>
      </div>
      <div className="evidence-strip">
        <div>
          <span>WEATHER RECORD</span>
          <strong>{weather.length.toLocaleString()} days</strong>
          <small>
            {availableStart || "No dates"} — {availableEnd || "No dates"} ·
            historical observations
          </small>
        </div>
        <div>
          <span>VEGETATION RECORD</span>
          <strong>{veg?.observations.length ?? 0} scenes</strong>
          <small>
            {veg?.product ?? "Not loaded"} {veg?.version} · 2023
          </small>
        </div>
        <div>
          <span>SOIL EVIDENCE</span>
          <strong>{farm.soil.date ? "User supplied" : "Not measured"}</strong>
          <small>{farm.soil.source || "Local test needed"}</small>
        </div>
      </div>
      <section className="paper">
        <div className="date-filter-row">
          <label>
            Show observations from
            <input
              type="date"
              aria-label="Weather view start"
              min={availableStart}
              max={dateTo || availableEnd}
              value={dateFrom || availableStart}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label>
            Through
            <input
              type="date"
              aria-label="Weather view end"
              min={dateFrom || availableStart}
              max={availableEnd}
              value={dateTo || availableEnd}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <span>
            {filteredWeather.length.toLocaleString()} daily rows shown. Charts
            filter the available observations; the common rotation horizon stays
            July2021–June2024.
          </span>
        </div>
        <div className="section-title">
          <h3>
            <CloudRain size={19} /> Historical weather
          </h3>
          <span className="source-tag">NASA POWER</span>
        </div>
        <p className="note">
          {weatherSource}. T2M_MIN/MAX: °C; PRECTOTCORR: mm/day. MERRA-2
          meteorology grid ~0.50° × 0.63° (rounded). This is regional reanalysis, not an
          on-field rain gauge.
        </p>
        <div
          className="chart"
          role="img"
          aria-label={`Monthly rainfall totals ${dateFrom || availableStart} through ${dateTo || availableEnd}`}
        >
          <ResponsiveContainer>
            <AreaChart data={monthly} margin={{ top: 18, right: 32, bottom: 16, left: 8 }}>
              <CartesianGrid vertical={false} stroke="#e1e4dc" />
              <XAxis dataKey="date" minTickGap={50} />
              <YAxis unit=" mm" width={65} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip formatter={v => typeof v === "number" ? formatNumber(v) : String(v ?? "Unknown")} />
              <Area
                isAnimationActive={false}
                dataKey="rain"
                name="Monthly rainfall (mm)"
                stroke="#427b83"
                fill="#b9d1ce"
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div
          className="chart chart-short"
          role="img"
          aria-label="Monthly mean of daily maximum temperature"
        >
          <ResponsiveContainer>
            <LineChart data={monthly} margin={{ top: 18, right: 32, bottom: 16, left: 8 }}>
              <XAxis dataKey="date" minTickGap={50} />
              <YAxis unit="°C" width={65} tickFormatter={v => formatNumber(Number(v))} />
              <Tooltip formatter={v => typeof v === "number" ? formatNumber(v) : String(v ?? "Unknown")} />
              <Line
                isAnimationActive={false}
                dataKey="max"
                name="Mean daily maximum (°C)"
                stroke="#b47743"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary>Accessible monthly weather table</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Rainfall mm</th>
                  <th>Mean Tmax °C</th>
                  <th>Valid days</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((d) => (
                  <tr key={d.date}>
                    <th>{d.date}</th>
                    <td>{rounded(d.rain)}</td>
                    <td>{d.max?.toFixed(1) ?? "Unknown"}</td>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <label className="request-years">
          NASA observation request ends in
          <select
            aria-label="NASA observation end year"
            value={requestEnd}
            onChange={(e) => setRequestEnd(Number(e.target.value))}
          >
            <option value="2024">2024 · same period as cached sample</option>
            <option value="2025">
              2025 · request newer historical observations
            </option>
          </select>
          <small>
            Newer data appear only after a successful validated NASA response.
            HLS vegetation remains its separately dated2023 record. This is not
            a forecast.
          </small>
        </label>
        <button className="secondary" disabled={busy} onClick={live}>
          {busy
            ? `Updating NASA history · ${requestYear ?? 2018} (${requestEnd - 2018 + 1} yearly requests)`
            : "Update historical weather from NASA"}
        </button>
        {liveError && (
          <p className="warning" role="alert">
            {liveError}
          </p>
        )}
        <p className="note">
          Live retrieval is optional and makes at most seven sequential
          requests. A complete validated response replaces the cache in this
          session only. Failed/CORS/timeout responses preserve the current data.
        </p>
      </section>
      <section className="paper">
        <div className="section-title">
          <h3>
            <Globe2 size={19} /> Vegetation, seen from orbit
          </h3>
          <span className="source-tag">HLS L30 v2.0</span>
        </div>
        {veg ? (
          <>
            <p>
              Genuine cached observations · 2023 · retrieved {veg.retrieved}. 9
              × 9 pixels at 30 m; the 270 × 270 m regional footprint contains
              mixed land cover.
            </p>
            <div
              className="chart"
              role="img"
              aria-label="Quality-filtered HLS NDVI time series"
            >
              <ResponsiveContainer>
                <LineChart data={veg.observations} margin={{ top: 18, right: 32, bottom: 16, left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" minTickGap={55} />
                  <YAxis domain={[-0.2, 1]} />
                  <Tooltip formatter={v => typeof v === "number" ? formatNumber(v) : String(v ?? "Unknown")} />
                  <Line
                    isAnimationActive={false}
                    dataKey="ndvi"
                    name="Mean valid-pixel NDVI"
                    stroke="#54754a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="note">{veg.quality}</p>
            <div className="footprint">
              <div>
                <strong>Source footprint</strong>
                <code>
                  32.1000° N · 73.0000° E<br />
                  270 m × 270 m · UTM 43N
                </code>
                <p>{veg.note}</p>
              </div>
              <div
                className="pixel-grid"
                aria-label="9 by 9 pixel sampling footprint"
              >
                {Array.from({ length: 81 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            </div>
            <details>
              <summary>Scene identifiers, coverage & source links</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>NDVI</th>
                      <th>Valid / total</th>
                      <th>Coverage</th>
                      <th>Granule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veg.observations.map((o) => (
                      <tr key={o.item}>
                        <th>{o.date}</th>
                        <td>{o.ndvi?.toFixed(2) ?? "No valid pixels"}</td>
                        <td>
                          {o.validPixels} / {o.totalPixels}
                        </td>
                        <td>{Math.round(o.coverage * 100)}%</td>
                        <td>
                          <a href={o.source} target="_blank" rel="noreferrer">
                            {o.item}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>{veg.failures.length} acquisition failures recorded.</p>
            </details>
          </>
        ) : (
          <p className="warning">
            Vegetation cache missing. No NDVI is invented. Restore
            public/data/vegetation.json or run the HLS preprocessing script.
          </p>
        )}
        <div className="callout">
          <Info size={20} />
          <p>
            A low NDVI value may mean less live vegetation. It does not prove
            bare soil, absent residue, crop identity, nutrients or carbon.
            Confirm cover and residue with the farmer.
          </p>
        </div>
        <label>
          Farmer confirmation / observations
          <textarea
            value={farm.observations}
            onChange={(e) =>
              p.setFarm({ ...farm, observations: e.target.value })
            }
          />
        </label>
      </section>
      <section className="paper">
        <h3>Soil & crop parameter imports</h3>
        <p>
          Soil and crop-date tables can be restored as plan JSON in Your plan.
          Crop parameters can also be imported below; local source and
          region/variety applicability are required. Imported parameters
          recompute every option and are marked unverified.
        </p>
        <button
          className="secondary"
          onClick={() =>
            download(
              "fieldshift-crop-table.json",
              JSON.stringify(
                Object.fromEntries(
                  Object.entries(farm.cropTable ?? CROPS).map(([id, c]) => [
                    id,
                    {
                      ...c,
                      applicability:
                        c.applicability ||
                        "Punjab pilot; exact cultivar unverified",
                    },
                  ]),
                ),
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          Download editable crop table
        </button>
        <label className="file-input">
          Import crop registry JSON
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 200000)
                  throw Error("Crop table exceeds 200 KB");
                p.setFarm({
                  ...farm,
                  cropTable: parseCropTable(await file.text()),
                });
                say(
                  "User crop parameters imported; review their applicability.",
                );
              } catch (err) {
                say(String(err));
              }
            }}
          />
        </label>
        {farm.cropTable && (
          <button
            className="text-action"
            onClick={() => p.setFarm({ ...farm, cropTable: undefined })}
          >
            Restore bundled crop parameters
          </button>
        )}
      </section>
      <section className="paper">
        <h3>
          <Upload size={18} /> Bring your own weather
        </h3>
        <p>
          JSON rows:{" "}
          <code>
            {'{date:"YYYY-MM-DD", min:°C|null, max:°C|null, rain:mm|null}'}
          </code>
          . Blank/missing observations must be null. Record the coordinates
          represented by this dataset.
        </p>
        <div className="form-row">
          <NumberField
            label="Dataset latitude"
            value={importLat}
            min={-90}
            max={90}
            step={0.0001}
            onChange={(n) => n !== null && setImportLat(n)}
          />
          <NumberField
            label="Dataset longitude"
            value={importLon}
            min={-180}
            max={180}
            step={0.0001}
            onChange={(n) => n !== null && setImportLon(n)}
          />
        </div>
        <label className="file-input">
          Import daily JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 3000000) throw Error("Maximum 3 MB");
                setWeather(parseWeather(await file.text()));
                setLatitudeData(importLat);
                setLongitudeData(importLon);
                setWeatherSource(
                  `User-imported weather · ${file.name} · provenance unverified`,
                );
                say("Imported weather; check coverage and source.");
              } catch (err) {
                say(String(err));
              }
            }}
          />
        </label>
        <p className="note">
          Incomplete years and missing dates remain unresolved. Crop tables are
          editable in src/data/crops.ts; imported plan JSON supports all soil
          and crop-date inputs. No personal data is sent to GitHub.
        </p>
      </section>
    </>
  );
}
function Timeline({
  result: r,
  crops = CROPS,
}: {
  result: Result;
  crops?: typeof CROPS;
}) {
  const start = "2021-07-01";
  const horizon = daysBetween(start, "2024-07-01");
  return (
    <div className="rotation-timeline">
      <div className="timeline-years">
        <span>JUL 2021</span>
        <span>JUL 2022</span>
        <span>JUL 2023</span>
        <span>JUN 2024</span>
      </div>
      <div className="timeline-track" aria-label={`${r.name} crop calendar`}>
        {r.sequence.map((p, i) => (
          <div
            className={`crop-block crop-${p.crop}`}
            key={i}
            style={{
              insetInlineStart: `${Math.max(0, (daysBetween(start, p.sow) / horizon) * 100)}%`,
              width: `${Math.max(0, (daysBetween(p.sow, p.harvest) / horizon) * 100)}%`,
            }}
            title={`${crops[p.crop].name}: ${p.sow} to ${p.harvest}`}
          >
            <span>
              {crops[p.crop].name
                .replace("Autumn ", "")
                .replace("Kharif ", "")
                .replace("Spring mung cover", "Cover")}
            </span>
            <div className="stage-bars">
              {crops[p.crop].stages.map((v, j) => (
                <i
                  key={j}
                  style={{ width: `${v * 100}%`, opacity: 0.35 + j * 0.16 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="timeline-key">
        <span>Stages: initial → development → mid → late</span>
        <span>Open gaps = no live crop assumed</span>
      </div>
    </div>
  );
}
function ResultCard({
  r,
  selected = false,
  onSelect,
  crops = CROPS,
}: {
  r: Result;
  selected?: boolean;
  onSelect?: () => void;
  crops?: typeof CROPS;
}) {
  return (
    <article className={`rotation-card ${selected ? "selected" : ""}`}>
      <div className="rotation-title">
        <div>
          <span className="section-index">
            {r.id === "baseline"
              ? "BASELINE"
              : r.id === "pulse"
                ? "ALTERNATIVE 01"
                : "ALTERNATIVE 02"}
          </span>
          <h3>{r.name}</h3>
          <p>{r.description}</p>
        </div>
        <span className={`status status-${r.status}`}>
          {r.status === "feasible" ? "Screening-feasible" : r.status}
        </span>
      </div>
      <Timeline result={r} crops={crops} />
      <div className="metric-row">
        <Metric
          name="Delivered irrigation"
          value={rounded(r.delivered, " mm")}
        />
        <Metric
          name="Live crop days"
          value={`${Math.round(r.liveCover * 100)}%`}
        />
        <Metric name="Plant families" value={String(r.families)} />
        <Metric
          name="Heat / frost exposure"
          value={`${rounded(r.heatDays)} / ${rounded(r.frostDays)} d`}
        />
      </div>
      <div className="rotation-foot">
        <span>
          {r.legume
            ? "Includes a legume · no N credit assumed"
            : "Cereal family only"}
          {r.pareto ? " · Non-dominated" : ""}
        </span>
        {onSelect && (
          <button className="text-action" onClick={onSelect}>
            {selected ? "Inspecting" : "Inspect assumptions"}{" "}
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
function Metric({ name, value }: { name: string; value: string }) {
  return (
    <div className="metric">
      <span>{name}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Lab({ results, farm }: DataProps) {
  const crops = farm.cropTable ?? CROPS;
  const [selected, setSelected] = useState("baseline");
  const r = results.find((v) => v.id === selected) || results[0];
  return (
    <>
      <div className="section-intro">
        <h2>Three years. Different possibilities.</h2>
        <p>
          Compare the same area and horizon. Feasibility comes first; your
          priorities cannot override a constraint. “Screening-feasible” means
          only that the entered assumptions pass these rules.
        </p>
      </div>
      <div className="lab-summary">
        <span>
          <Check size={16} />
          {results.filter((v) => v.status === "feasible").length -
            Number(results[0].status === "feasible")}{" "}
          of 2 alternatives pass current screens
        </span>
        <span>
          <Info size={16} />
          No yield or profit forecast
        </span>
      </div>
      {results.map((r) => (
        <ResultCard
          crops={crops}
          key={r.id}
          r={r}
          selected={r.id === selected}
          onSelect={() => setSelected(r.id)}
        />
      ))}
      <section className="paper">
        <h3>Inside “{r.name}”</h3>
        <div className="two-cols">
          <div>
            <h4>What would make this viable?</h4>
            {r.constraints.length + r.unknowns.length === 0 ? (
              <p className="success">
                Current inputs pass the screening rules. Confirm local cultivar,
                salinity method, equipment and market before acting.
              </p>
            ) : (
              <>
                <ul>
                  {r.constraints.map((v, i) => (
                    <li key={`c${i}`}>
                      <strong>Binding constraint:</strong> {v}
                    </li>
                  ))}
                  {r.unknowns.map((v, i) => (
                    <li key={`u${i}`}>
                      <strong>Unknown evidence:</strong> {v}
                    </li>
                  ))}
                </ul>
                <p className="note">
                  Unknown evidence is not proof of infeasibility. Recheck after
                  supplying matching data; changing priorities will not remove
                  hard constraints.
                </p>
              </>
            )}
            <h4>Management assumptions</h4>
            <p>
              Residue protection is assumed for 45 days after a harvest flagged
              “retain residue.” This is not a measured decomposition model.
              Cover is terminated 15 June; seed, labor and termination costs
              remain unknown.
            </p>
          </div>
          <div>
            <h4>Crop evidence & provisional parameters</h4>
            {[...new Set(r.sequence.map((v) => v.crop))].map((id) => (
              <details key={id}>
                <summary>
                  {crops[id].name} · {crops[id].family}
                </summary>
                <p>
                  Sowing {crops[id].window.join(" – ")}; duration{" "}
                  {crops[id].duration.join("–")} d; Kc{" "}
                  {crops[id].kc.join(" / ")}; demo roots {crops[id].rootM} m.
                </p>
                <ul>
                  {crops[id].provisional.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <a href={crops[id].source} target="_blank" rel="noreferrer">
                  Calendar / crop reference <ExternalLink size={12} />
                </a>
              </details>
            ))}
          </div>
        </div>
        <details>
          <summary>Climate exposure by crop stage</summary>
          <p className="note">
            Counts use provisional crop thresholds throughout each stage. They
            are exposure indicators, not damage or yield functions.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Stage</th>
                  <th>Days</th>
                  <th>Heat</th>
                  <th>Frost</th>
                  <th>ET &gt; effective rain</th>
                </tr>
              </thead>
              <tbody>
                {r.stageExposure.map((v) => (
                  <tr key={v.crop + v.stage}>
                    <th>{v.crop}</th>
                    <td>{v.stage}</td>
                    <td>{v.days}</td>
                    <td>{v.heat}</td>
                    <td>{v.frost}</td>
                    <td>{v.deficit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <details>
          <summary>Exact dates, crop stages and transition buffers</summary>
          <table>
            <thead>
              <tr>
                <th>Crop</th>
                <th>Sown</th>
                <th>Harvest / terminate</th>
                <th>Days</th>
                <th>Residue</th>
              </tr>
            </thead>
            <tbody>
              {r.sequence.map((p, i) => (
                <tr key={i}>
                  <td>{CROPS[p.crop].name}</td>
                  <td>{p.sow}</td>
                  <td>{p.harvest}</td>
                  <td>{daysBetween(p.sow, p.harvest)}</td>
                  <td>{p.residue ? "45-day assumption" : "None assumed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = "",
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
  help?: string;
}) {
  return (
    <label className="slider-label">
      <span>
        {label}
        <strong>
          {formatNumber(value)}
          {unit}
        </strong>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      {help && <small>{help}</small>}
    </label>
  );
}
function Scenarios({ farm, scenario: s, setScenario, results }: DataProps) {
  const patch = (x: Partial<Scenario>) => setScenario({ ...s, ...x });
  return (
    <>
      <div className="section-intro">
        <h2>A season will never hold still.</h2>
        <p>
          Explore hypothetical stress tests. These perturb historical
          observations; they are not forecasts or calibrated probabilities.
        </p>
      </div>
      <div className="scenario-layout">
        <section className="paper scenario-controls">
          <span className="source-tag">HYPOTHETICAL STRESS TEST</span>
          <Slider
            label="Rainfall relative to history"
            value={s.rainFactor * 100}
            min={0}
            max={150}
            step={5}
            unit="%"
            onChange={(v) => patch({ rainFactor: v / 100 })}
          />
          <Slider
            label="Temperature change"
            value={s.tempDelta}
            min={-3}
            max={5}
            step={0.5}
            unit="°C"
            onChange={(v) => patch({ tempDelta: v })}
          />
          <Slider
            label="Available delivered water"
            value={s.waterFactor * 100}
            min={0}
            max={150}
            step={5}
            unit="%"
            onChange={(v) => patch({ waterFactor: v / 100 })}
            help={`Base limit ${rounded(farm.waterLimitMm)} mm / 36 months`}
          />
          <Slider
            label="Crop coefficient multiplier"
            value={s.kcFactor}
            min={0.7}
            max={1.3}
            step={0.1}
            unit="×"
            onChange={(v) => patch({ kcFactor: v })}
          />
          <button
            className="secondary"
            onClick={() => setScenario(clone(DEFAULT_SCENARIO))}
          >
            Reset stress test
          </button>
          <p className="note">
            Water supply changes constraint status; it does not reduce the
            crop's demand. Rain and temperature change the screening water
            requirement and exposure indicators.
          </p>
        </section>
        <section className="paper">
          <h3>
            <Droplets size={18} /> Delivered irrigation requirement
          </h3>
          <p>
            mm across 36 months; same area and assumed delivery efficiency.
            Unknown values are omitted.
          </p>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart
                data={results.map((r) => ({
                  name:
                    r.id === "baseline"
                      ? "Baseline"
                      : r.id === "pulse"
                        ? "Pulse + wheat"
                        : "Living bridge",
                  water: r.delivered,
                }))}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" />
                <YAxis unit=" mm" width={65} tickFormatter={v => formatNumber(Number(v))} />
                <Tooltip formatter={v => typeof v === "number" ? formatNumber(v) : String(v ?? "Unknown")} />
                <Bar
                  isAnimationActive={false}
                  dataKey="water"
                  name="Delivered irrigation (mm)"
                  fill="#567557"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {results.map((r) => (
            <div className="scenario-result" key={r.id}>
              <strong>{r.name}</strong>
              <span>{rounded(r.delivered, " mm")}</span>
              <span className={`status status-${r.status}`}>{r.status}</span>
            </div>
          ))}
        </section>
      </div>
      <section className="paper">
        <h3>Where the water goes</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>36-month indicator · mm</th>
                {results.map((r) => (
                  <th key={r.id}>
                    {r.id === "baseline"
                      ? "Baseline"
                      : r.id === "pulse"
                        ? "Pulse + wheat"
                        : "Living bridge"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Crop ET", "etc"],
                  ["Effective rainfall · 80%", "effectiveRain"],
                  ["Initial root-zone storage", "initialStorage"],
                  ["Final storage", "finalStorage"],
                  ["Uncropped soil evaporation", "soilEvaporation"],
                  ["Bucket drainage / overflow", "drainage"],
                  ["Net root-zone irrigation", "netIrrigation"],
                  ["Delivered irrigation", "delivered"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <th>{label}</th>
                  {results.map((r) => (
                    <td key={r.id}>{rounded(r[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Simplified daily bucket: storage carries between crops and seasons.
          Effective rainfall is a fixed 80% assumption. Missing storage uses 100
          mm only for provisional display and prevents ranking. Net irrigation
          fills daily ET deficits; delivered = net ÷ efficiency. These are
          screening requirements assuming supply is available, not actual
          applied irrigation. No aquifer dynamics, capillary rise or yield
          response. Rice ET excludes preparation, ponding, seepage and
          percolation; rice remains unresolved.
        </p>
      </section>
    </>
  );
}
function Tradeoffs({
  farm,
  weather,
  scenario: s,
  setScenario,
  results,
  aligned,
  say,
}: DataProps) {
  const [sens, setSens] = useState<ReturnType<typeof sensitivity> | null>(null);
  const [busy, setBusy] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    setSens(null);
    setBusy(false);
    return () => workerRef.current?.terminate();
  }, [farm, weather, s]);
  return (
    <>
      <div className="section-intro">
        <h2>Better for what?</h2>
        <p>
          No single number tells the whole story. Compare water, live cover,
          diversity and exposure before choosing priorities.
        </p>
      </div>
      <section className="paper">
        <div className="table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Individual metric</th>
                {results.map((r) => (
                  <th key={r.id}>
                    {r.name}
                    <span className={`status status-${r.status}`}>
                      {r.status}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Delivered water · mm",
                  ...results.map((r) => rounded(r.delivered)),
                ],
                [
                  "Delivered volume · m³",
                  ...results.map((r) => rounded(r.volume)),
                ],
                [
                  "Live crop cover · % days",
                  ...results.map((r) => Math.round(r.liveCover * 100)),
                ],
                [
                  "Residue-only protection · % days",
                  ...results.map((r) => Math.round(r.residueCover * 100)),
                ],
                ["Distinct plant families", ...results.map((r) => r.families)],
                [
                  "Legume inclusion",
                  ...results.map((r) => (r.legume ? "Yes; no N credit" : "No")),
                ],
                [
                  "Heat / frost exposure · days",
                  ...results.map(
                    (r) => `${rounded(r.heatDays)} / ${rounded(r.frostDays)}`,
                  ),
                ],
                [
                  "ET greater than effective rain · crop days",
                  ...results.map((r) => rounded(r.deficitDays)),
                ],
                [
                  "Input completeness · % incl. assumptions",
                  ...results.map((r) => Math.round(r.completeness * 100)),
                ],
                [
                  "Pareto comparison",
                  ...results.map((r) =>
                    r.pareto
                      ? "Non-dominated"
                      : r.status === "feasible"
                        ? "Dominated"
                        : "Not eligible",
                  ),
                ],
              ].map(([name, ...values]) => (
                <tr key={name}>
                  <th>{name}</th>
                  {values.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Pareto uses lower delivered water and exposure, higher live cover and
          family count. Only screening-feasible options are eligible. No profit
          comparison: dated yield, prices and costs are missing. Input
          completeness includes declared assumptions. It is separate from
          desirability and is not a measure of scientific validation.
        </p>
      </section>
      <section className="paper">
        <h3>Replay the weather, preserve the seasons.</h3>
        <p>
          Four consecutive 36-month windows starting July 2018, 2019, 2020 and
          2021. Crop month/day order stays fixed, including winter crossings.
          These overlapping windows are not independent trials.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Valid windows</th>
                <th>Delivered irrigation · min–max mm</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <th>{r.name}</th>
                  <td>{r.replay.length} / 4</td>
                  <td>
                    {r.replay.length
                      ? `${rounded(Math.min(...r.replay))}–${rounded(Math.max(...r.replay))}`
                      : "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="paper">
        <summary>Optional priorities & aggregate index</summary>
        <p>
          Fixed normalization: water 1 − delivered/6000 mm; live cover fraction;
          families/3; exposure 1 − (heat + frost days)/horizon days, each
          bounded 0–1. Weights are normalized by their sum. Unknown dimensions
          prevent ranking. Zero weights give no aggregate index.
        </p>
        <div className="two-cols">
          {Object.entries(s.weights).map(([key, v]) => (
            <Slider
              key={key}
              label={`${key[0].toUpperCase() + key.slice(1)} priority`}
              value={v}
              min={0}
              max={100}
              onChange={(n) =>
                setScenario({ ...s, weights: { ...s.weights, [key]: n } })
              }
            />
          ))}
        </div>
        {results.map((r) => (
          <div className="scenario-result" key={r.id}>
            <strong>{r.name}</strong>
            <span>
              {r.score === null ? "Not ranked" : `${r.score.toFixed(1)} / 100`}
            </span>
          </div>
        ))}
      </details>
      <section className="paper">
        <h3>Sensitivity before certainty</h3>
        <p>
          Enumerate rainfall ±20 percentage points around the current setting
          and Kc ×0.9/1.1, with other inputs fixed. Counts are frequencies in
          these six enumerated scenarios, not probabilities.
        </p>
        <button
          className="secondary"
          disabled={busy || !aligned}
          onClick={() => {
            setBusy(true);
            const worker = new Worker(
              new URL("./engine/sensitivity.worker.ts", import.meta.url),
              { type: "module" },
            );
            workerRef.current = worker;
            worker.onmessage = (event) => {
              setSens(event.data);
              setBusy(false);
              worker.terminate();
            };
            worker.onerror = () => {
              setBusy(false);
              worker.terminate();
              say(
                "Sensitivity calculation could not load. Reload the page or check the static bundle.",
              );
            };
            worker.postMessage({ farm, weather, scenario: s });
          }}
        >
          {busy ? "Calculating…" : "Run six sensitivity scenarios"}
        </button>
        {sens && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Feasible cases / 6</th>
                  <th>Water range · mm</th>
                  <th>Top aggregate index count / 6</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const rr = sens.map(
                    (c) => c.results.find((v) => v.id === r.id)!,
                  );
                  const water = rr.flatMap((v) =>
                    v.delivered === null ? [] : [v.delivered],
                  );
                  return (
                    <tr key={r.id}>
                      <th>{r.name}</th>
                      <td>
                        {rr.filter((v) => v.status === "feasible").length}
                      </td>
                      <td>
                        {water.length
                          ? `${rounded(Math.min(...water))}–${rounded(Math.max(...water))}`
                          : "Unknown"}
                      </td>
                      <td>
                        {
                          sens.filter((c) => {
                            const own = c.results.find((v) => v.id === r.id)!;
                            return (
                              own.score !== null &&
                              own.score ===
                                Math.max(
                                  ...c.results.map((v) => v.score ?? -Infinity),
                                )
                            );
                          }).length
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">
          Seed costs, water rights, cultivar choice, pests, labor and market
          uncertainty still require local review. A stable index is not
          agronomic validation.
        </p>
      </section>
    </>
  );
}
function Export(p: DataProps & { save: () => void; deletePlan: () => void }) {
  const { farm, scenario, results, say } = p;
  const packet = () => ({
    schema: 1,
    modelVersion: MODEL_VERSION,
    exportedAt: new Date().toISOString(),
    farm,
    scenario,
    horizon: ["2021-07-01", "2024-06-30"],
    weatherSource: p.weatherSource,
    weatherCoordinates: { lat: p.dataLat, lon: p.dataLon, matching: p.aligned },
    cropParameters: farm.cropTable ?? CROPS,
    results,
    vegetation: p.veg,
    sources: [
      "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
      "https://hls.gsfc.nasa.gov/data-products/",
      "https://www.fao.org/4/X0490E/x0490e00.htm",
    ],
    assumptions: [
      "80% effective rainfall",
      "50% initial storage",
      "7-day transition",
      "45-day residue retention display",
      "Provisional Kc and thresholds",
      "No yield, profit, nitrogen or carbon benefit guaranteed",
    ],
  });
  return (
    <>
      <div className="section-intro">
        <h2>Take the conversation to the field.</h2>
        <p>
          Save this screening plan and review its assumptions with a local
          agronomist. Your field inputs stay on this device unless you export or
          choose a live data request.
        </p>
      </div>
      <div className="export-grid">
        <button
          className="export-tile"
          onClick={() => void printAgrorithmReport()}
        >
          <Printer />
          <h3>Presentation PDF</h3>
          <p>
            16:9 slide report with inputs, comparisons, evidence, assumptions
            and sources. Browser print → Save as PDF.
          </p>
          <span>
            Open print view <ArrowUpRight size={17} />
          </span>
        </button>
        <button
          className="export-tile"
          onClick={() =>
            download(
              "agrorithm-plan.json",
              JSON.stringify(packet(), null, 2),
              "application/json",
            )
          }
        >
          <Download />
          <h3>Complete JSON</h3>
          <p>
            Inputs, exact dates, parameters, evidence, scenarios and model
            version.
          </p>
          <span>
            Download JSON <ArrowUpRight size={17} />
          </span>
        </button>
        <button
          className="export-tile"
          onClick={() => {
            const out = packet();
            const rows = [
              ["section", "key", "value"],
              ["metadata", "modelVersion", MODEL_VERSION],
              ["metadata", "exportedAt", out.exportedAt],
              ["inputs", "farm", JSON.stringify(farm)],
              ["settings", "scenario", JSON.stringify(scenario)],
              ["provenance", "weather", p.weatherSource],
              ["provenance", "vegetation", JSON.stringify(p.veg)],
              ["assumptions", "all", JSON.stringify(out.assumptions)],
              ["parameters", "crops", JSON.stringify(CROPS)],
              ...results.map((r) => ["result", r.id, JSON.stringify(r)]),
            ];
            const quote = (v: unknown) =>
              `"${String(v ?? "").replaceAll('"', '""')}"`;
            download(
              "fieldshift-plan.csv",
              rows.map((r) => r.map(quote).join(",")).join("\r\n"),
              "text/csv;charset=utf-8",
            );
          }}
        >
          <BarChart3 />
          <h3>Portable CSV</h3>
          <p>
            Traceable plan packet in rows, with nested fields preserved as JSON.
          </p>
          <span>
            Download CSV <ArrowUpRight size={17} />
          </span>
        </button>
      </div>
      <section className="paper">
        <h3>Keep or restore a plan</h3>
        <div className="button-row">
          <button className="primary" onClick={p.save}>
            <Save size={17} /> Save on this device
          </button>
          <button className="secondary" onClick={p.deletePlan}>
            <Trash2 size={17} /> Delete saved plan
          </button>
          <button
            className="secondary"
            onClick={() => {
              p.setFarm(clone(EMPTY));
              p.setScenario(clone(DEFAULT_SCENARIO));
              p.deletePlan();
              say("Inputs reset and saved plan deleted.");
            }}
          >
            Reset all inputs
          </button>
        </div>
        <label className="file-input">
          Restore exported plan JSON
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              try {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5000000) throw Error("Plan exceeds 5 MB");
                const d = JSON.parse(await file.text());
                const importedFarm = validateFarm(d.farm);
                const importedScenario = validateScenario(d.scenario);
                p.setFarm(importedFarm);
                p.setScenario(importedScenario);
                say(
                  "Plan restored. Cached weather is checked against its coordinates.",
                );
              } catch (err) {
                say(String(err));
              }
            }}
          />
        </label>
      </section>
      <section className="paper">
        <h3>Before deciding</h3>
        <ul>
          <li>
            Obtain a soil test with depth, date, pH/EC method and available
            water capacity.
          </li>
          <li>
            Confirm local crop variety, sowing windows, equipment and buyers.
          </li>
          <li>
            Check irrigation rights and actual delivered volume. Rice needs
            additional paddy water terms.
          </li>
          <li>
            Review cover-crop termination, seed, labor and irrigation cost; no
            free benefit is assumed.
          </li>
        </ul>
        <a href={asset("data/feedback-template.md")} download>
          Download blank farmer/agronomist feedback template
        </a>
        <p className="note">
          Software verification does not validate farming outcomes. This is an
          exploratory decision aid, not a recommendation to plant.
        </p>
      </section>
    </>
  );
}
function Sources() {
  return (
    <main className="standalone sources">
      <a href="#/">← Home</a>
      <IconText>METHODS & PROVENANCE</IconText>
      <h1>
        Evidence you can
        <br />
        <em>follow back.</em>
      </h1>
      <p className="lede">
        Begin with observations, respect constraints, then explore trade-offs.
        Every numeric benefit is a screening calculation with stated
        assumptions.
      </p>
      <div className="three-notes">
        <article>
          <span className="section-index">01</span>
          <h3>Observe the past</h3>
          <p>
            NASA POWER provides gridded historical temperatures and rainfall.
            HLS shows quality-filtered vegetation at a small regional footprint.
            Neither establishes a field's soil condition.
          </p>
        </article>
        <article>
          <span className="section-index">02</span>
          <h3>Screen the sequence</h3>
          <p>
            Calendar windows, duration, overlap, seven-day buffers, supplied
            water, exclusions and access constraints precede optional ranking.
            Missing evidence remains unresolved.
          </p>
        </article>
        <article>
          <span className="section-index">03</span>
          <h3>Compare openly</h3>
          <p>
            FAO Hargreaves screening ET0 and stage-specific Kc feed a daily
            storage bucket. Show component indicators, historical replay and
            sensitivity before an aggregate index.
          </p>
        </article>
      </div>
      <section className="paper">
        <h2>Source notebook</h2>
        {[
          [
            "NASA POWER daily API",
            "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
            "T2M_MIN/MAX °C, PRECTOTCORR mm/day; UTC; cached 2018–2024. Historical MERRA-2 grid ~0.50° × 0.63° (rounded).",
          ],
          [
            "HLS L30 v2.0",
            "https://hls.gsfc.nasa.gov/products-description/l30/",
            "2023 NASA/USGS reflectance via Microsoft mirror. 30 m pixels; QA-filtered 9×9 window; DOI 10.5067/HLS/HLSL30.002.",
          ],
          [
            "Punjab maize manual",
            "https://agripunjab.gov.pk/system/files/Maize-Cultivation-with-HEIS.pdf",
            "Regional sowing windows and duration.",
          ],
          [
            "Mungbean production manual",
            "https://worldveg.tind.io/record/66217/files/English_mungbean%20production%20manual.pdf",
            "Northern Punjab seasonal windows; local cultivar needs confirmation.",
          ],
          [
            "Pakistan Meteorological Department",
            "https://namc.pmd.gov.pk/assets/crop-reports/1038294586Model-crop-report-Faisalabad-wheat-2022-23.pdf",
            "Wheat planting reference; northern pilot adaptation provisional.",
          ],
          [
            "FAO Irrigation and Drainage Paper 56",
            "https://www.fao.org/4/X0490E/x0490e00.htm",
            "Extraterrestrial radiation, Hargreaves ET0 and crop coefficients.",
          ],
          [
            "FAO rice irrigation",
            "https://www.fao.org/4/s2022e/s2022e08.htm",
            "Rice requires preparation, standing-water and seepage/percolation terms beyond ET.",
          ],
          [
            "USGS aquifers & groundwater",
            "https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater",
            "Water occupies sediment pores and rock fractures. Illustration is not measured field depth.",
          ],
          [
            "Poly Haven texture assets · CC0",
            "https://polyhaven.com/license",
            "Forest Ground 04, Aerial Grass Rock and Brown Mud 02. Bundled, with full checksums and creators in the repository.",
          ],
        ].map(([title, url, text]) => (
          <article className="source-row" key={title}>
            <a href={url} target="_blank" rel="noreferrer">
              {title} <ArrowUpRight size={16} />
            </a>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="paper">
        <h3>Boundaries worth keeping</h3>
        <p>
          The pilot is a regional demonstration, not a surveyed farm or verified
          farmer case. Soil and current rotation are declared demo assumptions.
          No nutrient/carbon inference from NDVI, field-depth inference from
          SMAP/GRACE, aquifer simulation, future yield or guaranteed improvement
          is provided.
        </p>
        <p>
          HLS NASA Earthdata downloads require login; the preprocessing script
          uses NASA's documented Microsoft mirror. ORNL MODIS service returned
          503 during acquisition. The official challenge URL returned 502 during
          initial verification. These access outcomes are recorded in the data
          registry.
        </p>
        <p>
          The current interface is in English. Unknown answers are allowed; the
          core planner works without WebGL and without live services.
        </p>
      </section>
    </main>
  );
}
function About() {
  return (
    <main className="standalone about">
      <a href="#/">← Home</a>
      <IconText>NASA SPACE APPS 2026</IconText>
      <div className="about-hero">
        <div>
          <h1>
            From our team.
            <br />
            <em>For the next season.</em>
          </h1>
          <p className="lede">
            {BRAND.name} explores how Earth observations, local knowledge and
            transparent crop screening can support a better-informed
            conversation about rotation.
          </p>
        </div>
        <img
          src={asset("images/agrorithm-logo.png")}
          alt="Agrorithm"
        />
      </div>
      <section className="paper">
        <h2>Team jt_1</h2>
        <div className="team-grid">
          {MEMBERS.map((m, i) => (
            <div key={m}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{m}</h3>
            </div>
          ))}
        </div>
      </section>
      <p className="note">
        Challenge: Field Shift: Adapting Farms with NASA Data. NASA/USGS data
        use does not imply endorsement. This pilot needs real farmer and
        agronomist review; no interviews or outcomes are claimed.
      </p>
      <a href="https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/">
        Official challenge reference <ArrowUpRight size={16} />
      </a>
    </main>
  );
}
function DesignReview({ start }: { start: (c: Concept) => void }) {
  return (
    <main className="standalone design-review">
      <a href="#/">← Home</a>
      <IconText>DESIGN REVIEW · SEPARATE FROM THE FARMER JOURNEY</IconText>
      <h1>
        One engine.
        <br />
        <em>Three ways in.</em>
      </h1>
      <p className="lede">
        Field Studio is the default. Every concept shares field state, scenario
        calculations, evidence and export. Switching routes preserves current
        in-memory inputs.
      </p>
      {(["studio", "console", "companion"] as Concept[]).map((c) => (
        <section className={`paper design-concept ${c}`} key={c}>
          <h2>
            {c === "studio"
              ? "01 · Field Studio"
              : c === "console"
                ? "02 · Agronomist Console"
                : "03 · Farmer Companion"}
          </h2>
          <p>
            {c === "studio"
              ? "Spacious editorial hierarchy, a broad seasonal calendar, warm paper and grounded green."
              : c === "console"
                ? "A fixed evidence rail, compact comparison tables and a small 3D inspector for a quantitative review."
                : "A single-column guided sequence, large controls and progressive detail for touch and small screens."}
          </p>
          <div className="button-row">
            <button className="primary" onClick={() => start(c)}>
              Open complete sample journey <ArrowUpRight size={16} />
            </button>
            <a href={`#/${c}/lab`}>Use current inputs</a>
          </div>
          <div className="preview-pair">
            <iframe
              title={`${c} desktop preview`}
              src={`#/${c}/lab`}
              loading="lazy"
            />
            <iframe
              title={`${c} mobile preview`}
              src={`#/${c}/setup`}
              loading="lazy"
              className="mobile-preview"
            />
          </div>
        </section>
      ))}
    </main>
  );
}
