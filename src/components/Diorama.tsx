import { useRef, useState } from "react";
import { RotateCcw, Layers, Move3D, Sprout, Droplets } from "lucide-react";
import ModelStage, { useScrollProgress } from "./ModelStage";
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
  const [explode, setExplode] = useState<boolean | null>(null),
    [layers, setLayers] = useState(true),
    [roots, setRoots] = useState(true),
    [process, setProcess] = useState("none"),
    [depth, setDepth] = useState(7),
    [reset, setReset] = useState(0);
  const story = useRef<HTMLDivElement>(null);
  const localProgress = useScrollProgress(story, motion && explorer);
  const phase = explorer ? localProgress : progress;
  const smooth = (value: number) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  const guidedSeparation =
    motion && view === "root-zone"
      ? smooth((phase - 0.28) / 0.22) * (1 - smooth((phase - 0.78) / 0.18))
      : 0;
  const separation = explode === null ? guidedSeparation : explode ? 1 : 0;
  const annotations =
    view === "root-zone"
      ? [
          {
            id: "surface",
            title: "Living surface",
            detail: "Illustrative cereal canopy",
            node: "Surface_Grain",
          },
          {
            id: "roots",
            title: "Visible root network",
            detail: "Illustrative roots, not a field measurement",
            node: "Roots_Right_Section",
          },
          {
            id: "subsoil",
            title: "Irregular soil horizons",
            detail: "Demo boundaries around 0.39, 1.13, 2.02 m",
            node: "Layer_Subsoil",
          },
        ]
      : [
          {
            id: "water",
            title: "Water held in pores",
            detail: "Water table " + depth + " m · user-controlled",
            position: [0.3, -depth / 10, 1.57] as [number, number, number],
          },
          {
            id: "unsaturated",
            title: "Unsaturated material",
            detail: "Solid sediment with pore space",
            node: "Layer_Unsaturated",
          },
        ];
  return (
    <section
      className={`diorama ${compact ? "compact" : ""} ${explorer ? "explorer soil-exhibit" : ""}`}
      aria-label="Illustrative soil cutaway"
      data-layer-mode={explode === null ? "guided" : "manual"}
      data-layer-separation={separation}
    >
      <div ref={story} className={explorer ? "soil-scene-journey" : ""}>
        <div className={explorer ? "soil-exhibit-sticky" : ""}>
          {explorer && (
            <div className="exhibit-caption">
              <span className="eyebrow">
                {view === "root-zone"
                  ? "ROOT-ZONE CUTAWAY"
                  : "UNCONFINED GROUNDWATER EXAMPLE"}
              </span>
              <h2>
                {phase < 0.45
                  ? "See what supports the surface."
                  : phase < 0.78
                    ? "Follow the hidden connections."
                    : "Inspect the evidence, keep the uncertainty."}
              </h2>
            </div>
          )}
          <ModelStage
            url={`models/${view}-v2.glb`}
            poster={`images/${view}-v2.webp`}
            title={
              view === "root-zone"
                ? "Root-zone farm cutaway"
                : "Groundwater cutaway"
            }
            motion={motion}
            quality={quality}
            compact={compact || !explorer}
            progress={phase}
            resetKey={reset}
            options={{
              view,
              layers,
              roots,
              explode: separation > 0,
              separation,
              process,
              depth,
              rain,
            }}
            annotations={annotations}
          />
        </div>
      </div>
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
            <button
              aria-pressed={separation > 0.5}
              onClick={() => setExplode(!(separation > 0.5))}
            >
              <Move3D size={17} /> Separate layers
            </button>
            {explode !== null && (
              <button onClick={() => setExplode(null)}>
                <RotateCcw size={17} /> Follow scroll
              </button>
            )}
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
            Drag to orbit; Ctrl + wheel or the +/− controls zoom. Reset restores
            the stable cutaway.{" "}
            {view === "root-zone"
              ? "Demo layer boundaries vary around 0.39, 1.13 and 2.02 m. Scroll reveals illustrative gaps between the layers; these are not measured soil horizons or physical depth changes. The layer control overrides the guided reveal."
              : "Scale break: this view represents 0–20 m. Blue wet shading and enlarged pore markers illustrate saturation below the user-controlled table. Colors and pore sizes are illustrative; no cavity or measured field depth is implied."}{" "}
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
