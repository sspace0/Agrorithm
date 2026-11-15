import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { asset, BRAND } from "../config";
import "./boot.css";

/** Prepare the active view under the splash; optional offscreen models remain lazy. */
export default function BootOverlay({
  dataSteps,
  initialRoute,
  quality,
}: {
  dataSteps: number;
  initialRoute: string;
  quality: string;
}) {
  const [expectScene] = useState(
    () =>
      quality !== "static" &&
      (initialRoute === "/" ||
        (/^\/(soil|crops)/.test(initialRoute) &&
          !matchMedia("(max-width:760px)").matches)),
  );
  const [fonts, setFonts] = useState(false),
    [images, setImages] = useState(false),
    [scene, setScene] = useState(false),
    [minimum, setMinimum] = useState(false),
    [leaving, setLeaving] = useState(false),
    [finished, setFinished] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const frame = requestAnimationFrame(() => {
      Promise.allSettled([
        document.fonts.load('italic 24px "Instrument Serif"'),
        document.fonts.load('400 16px "DM Sans"'),
      ])
        .then(() => document.fonts.ready)
        .then(() => {
          if (alive) setFonts(true);
        });
      const critical = [
        ...document.querySelectorAll<HTMLImageElement>(
          ".brand-logo,.satellite-base,.earth-poster img,.model-poster",
        ),
      ].filter((img) => img.getBoundingClientRect().top < innerHeight);
      Promise.allSettled(critical.map((img) => img.decode())).then(() => {
        if (alive) setImages(true);
      });
    });
    const ready = () => setScene(true);
    addEventListener("agrorithm:scene-ready", ready);
    const min = window.setTimeout(() => setMinimum(true), 450);
    const deadline = window.setTimeout(() => setLeaving(true), 8000);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      clearTimeout(min);
      clearTimeout(deadline);
      removeEventListener("agrorithm:scene-ready", ready);
    };
  }, []);
  const done =
      Math.min(2, dataSteps) +
      Number(fonts) +
      Number(images) +
      Number(!expectScene || scene),
    total = 5;
  useEffect(() => {
    if (minimum && done === total) setLeaving(true);
  }, [minimum, done]);
  useEffect(() => {
    if (leaving)
      timer.current = window.setTimeout(() => setFinished(true), 250);
    return () => clearTimeout(timer.current);
  }, [leaving]);
  if (finished) return null;
  const tasks = [
    { label: "Historical observations", ready: dataSteps === 2 },
    { label: "Typography & images", ready: fonts && images },
    {
      label: expectScene ? "Active 3D scene" : "Page layout",
      ready: !expectScene || scene,
    },
  ];
  return (
    <section
      className={`boot-overlay ${leaving ? "boot-leaving" : ""}`}
      aria-label={`Preparing ${BRAND.name}`}
      role="status"
      aria-live="polite"
      data-boot-overlay
    >
      <div className="boot-content">
        <img
          className="boot-logo"
          src={asset("images/agrorithm-logo.png")}
          alt={BRAND.name}
        />
        <p className="boot-eyebrow">PREPARING YOUR FIELD VIEW</p>
        <h2>
          A little perspective.
          <br />
          <em>A clearer next season.</em>
        </h2>
        <div
          className="boot-progress"
          role="progressbar"
          aria-label="View preparation"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <i style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <div className="boot-tasks">
          {tasks.map((t) => (
            <span key={t.label} className={t.ready ? "is-ready" : ""}>
              {t.ready ? <Check size={13} /> : <i />}
              {t.label}
            </span>
          ))}
        </div>
        <p className="boot-count">
          {done} of {total} preparation steps ready
        </p>
        <button type="button" onClick={() => setLeaving(true)}>
          Continue while loading <ArrowRight size={16} />
        </button>
        <small>
          Your saved plan stays on this device. Optional models load as you
          explore.
        </small>
      </div>
    </section>
  );
}
