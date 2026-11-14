import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  RotateCcw,
  Layers,
  Move3D,
  Sprout,
  Droplets,
  Play,
} from "lucide-react";
import { asset } from "../config";
const SoilCanvas = lazy(() => import("./SoilCanvas"));
class SafeCanvas extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function Diorama({
  motion,
  quality,
  compact = false,
  explorer = false,
  rain = 1,
  progress = 0,
}: {
  motion: boolean;
  quality: string;
  compact?: boolean;
  explorer?: boolean;
  rain?: number;
  progress?: number;
}) {
  const [view, setView] = useState<"root-zone" | "groundwater">("root-zone");
  const [explode, setExplode] = useState(false);
  const [layers, setLayers] = useState(true);
  const [roots, setRoots] = useState(true);
  const [process, setProcess] = useState("none");
  const [depth, setDepth] = useState(7);
  const [reset, setReset] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [near, setNear] = useState(false);
  const [requested, setRequested] = useState(false);
  const constrained =
    matchMedia("(max-width: 760px)").matches ||
    !!(navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData;
  const staticFirst = quality === "auto" && constrained && !requested;
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "150px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const lost = () => setFailed(true);
    el.addEventListener("fieldshift-context-lost", lost);
    return () => el.removeEventListener("fieldshift-context-lost", lost);
  }, []);
  useEffect(() => setLoaded(false), [view]);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2");
      setReady(!!gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setReady(false);
    }
  }, []);
  return (
    <section
      className={`diorama ${compact ? "compact" : ""} ${explorer ? "explorer" : ""}`}
      aria-label="Illustrative soil cutaway"
    >
      <div className="scene-window" ref={container}>
        {posterFailed &&
          (!loaded || failed || quality === "static" || staticFirst) && (
            <svg
              className="poster"
              viewBox="0 0 640 500"
              role="img"
              aria-label="Static soil cutaway: planted surface, topsoil, subsoil and parent material; illustrative layers."
            >
              <path fill="#bea47a" d="M100 170 320 90 550 180 330 280Z" />
              <path fill="#74533a" d="M100 170 330 280 330 400 100 290Z" />
              <path fill="#92704e" d="M330 280 550 180 550 300 330 400Z" />
              <path fill="#aa8b63" d="M100 290 330 400 330 455 100 345Z" />
              <path fill="#bda47a" d="M330 400 550 300 550 355 330 455Z" />
              <path
                fill="none"
                stroke="#526f43"
                strokeWidth="8"
                d="M180 200v-75m75 110v-90m95 65v-90m80 45V95m50 75v-60"
              />
              <path
                fill="none"
                stroke="#d3c29a"
                strokeWidth="3"
                d="m150 200 22 90-25 38m65-99-12 70 28 48m54-77 15 65-12 35m-110-94 30 30m-5-8 25 5"
              />
            </svg>
          )}
        <img
          className="poster"
          style={{
            opacity:
              posterFailed ||
              (loaded && !failed && quality !== "static" && !staticFirst)
                ? 0
                : 1,
          }}
          onError={() => setPosterFailed(true)}
          src={asset(`images/${view}-v2.webp`)}
          alt={
            view === "root-zone"
              ? "Cereal plants above a textured soil block, with pale roots visible on its cut face."
              : "Solid sediment with blue pore markers below an illustrative water-table boundary."
          }
        />
        {ready && near && !failed && quality !== "static" && !staticFirst && (
          <SafeCanvas onFail={() => setFailed(true)}>
            <Suspense fallback={null}>
              <div className="canvas-mount" key={view}>
                <SoilCanvas
                  view={view}
                  onLoaded={() => setLoaded(true)}
                  motion={motion}
                  quality={quality}
                  explode={explode}
                  layers={layers}
                  roots={roots}
                  process={process}
                  rain={rain}
                  progress={progress}
                  depth={depth}
                  reset={reset}
                  interactive={explorer}
                />
              </div>
            </Suspense>
          </SafeCanvas>
        )}
        {staticFirst && (
          <button className="load-3d" onClick={() => setRequested(true)}>
            <Play size={15} />
            Load interactive 3D
          </button>
        )}
        <span className="scene-stamp">
          <span /> ILLUSTRATIVE GEOMETRY
        </span>
        <div className="soil-label soil-label-top">
          {view === "root-zone" ? "Living surface" : "Land surface"}
          <small>
            {view === "root-zone"
              ? "Cereal appearance · illustrative"
              : "Unconfined example"}
          </small>
        </div>
        <div className="soil-label soil-label-bottom">
          {view === "root-zone"
            ? "A world beneath your feet"
            : "Water held in pores"}
          <small>
            {view === "root-zone"
              ? "Root-zone view · 0–2 m demo scale"
              : `Water table ${depth} m · user-controlled`}
          </small>
        </div>
      </div>
      {failed && (
        <p role="status" className="note">
          3D is unavailable. The poster and all planning tools remain available.
        </p>
      )}
      {explorer ? (
        <>
          <div className="scene-toolbar">
            <div className="segmented">
              <button
                aria-pressed={view === "root-zone"}
                onClick={() => setView("root-zone")}
              >
                <Sprout size={16} /> Root zone
              </button>
              <button
                aria-pressed={view === "groundwater"}
                onClick={() => setView("groundwater")}
              >
                <Droplets size={16} /> Groundwater
              </button>
            </div>
            <button
              title="Reset view"
              aria-label="Reset view"
              onClick={() => setReset(reset + 1)}
            >
              <RotateCcw size={17} />
            </button>
            <button aria-pressed={explode} onClick={() => setExplode(!explode)}>
              <Move3D size={17} /> Separate layers
            </button>
            <button aria-pressed={layers} onClick={() => setLayers(!layers)}>
              <Layers size={17} /> Soil
            </button>
            <button aria-pressed={roots} onClick={() => setRoots(!roots)}>
              <Sprout size={17} /> Roots
            </button>
          </div>
          <div className="scene-options">
            <label>
              <span>
                <Droplets size={15} /> Explanatory process
              </span>
              <select
                value={process}
                onChange={(e) => setProcess(e.target.value)}
              >
                {["none", "rain", "infiltration", "uptake", "evaporation"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
            {view === "groundwater" && (
              <label>
                Illustrative water table · {depth} m
                <input
                  aria-label="Illustrative water table depth"
                  type="range"
                  min="3"
                  max="15"
                  value={depth}
                  onChange={(e) => setDepth(+e.target.value)}
                />
              </label>
            )}
          </div>
          <p className="note">
            Drag to orbit, scroll/pinch to zoom; reset restores the stable
            cutaway.{" "}
            {view === "root-zone"
              ? "Demo layer boundaries vary around 0.39, 1.13 and 2.02 m. These are not measured soil horizons."
              : "Scale break: this view represents 0–20 m. Blue markers represent water within sediment pores; no cavity is implied."}{" "}
            Processes illustrate pathways, not flow velocities or an aquifer
            simulation.
          </p>
        </>
      ) : (
        <div className="scene-caption">
          <span>01 / ROOT ZONE</span>
          <span>Drag to explore ↗</span>
        </div>
      )}
    </section>
  );
}
