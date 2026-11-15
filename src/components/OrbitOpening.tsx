import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Compass,
  Layers,
} from "lucide-react";
import { asset, BRAND } from "../config";
import { useScrollProgress } from "./ModelStage";
import "../landing.css";
const EarthCanvas = lazy(() => import("./EarthCanvas"));
class EarthBoundary extends Component<
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
export default function OrbitOpening({
  motion,
  quality,
  lang,
  start,
  resume,
  saved,
}: {
  motion: boolean;
  quality: string;
  lang: string;
  start: (sample: boolean) => void;
  resume: () => void;
  saved: boolean;
}) {
  const ref = useRef<HTMLElement>(null),
    progress = useScrollProgress(ref, motion, true);
  const [visible, setVisible] = useState(true),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const headerReady =
    introSkipped ||
    introCompleted ||
    !motion ||
    quality === "static" ||
    failed ||
    progress >= 0.94;
  useEffect(() => {
    if (progress >= 0.94) setIntroCompleted(true);
  }, [progress]);
  useEffect(() => {
    if (!motion || quality === "static" || failed) setIntroSkipped(true);
  }, [motion, quality, failed]);
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const previousInert = header?.inert ?? false;
    document.documentElement.dataset.orbitNavigation = headerReady
      ? "ready"
      : "intro";
    if (header) header.inert = !headerReady;
    return () => {
      delete document.documentElement.dataset.orbitNavigation;
      if (header) header.inert = previousInert;
    };
  }, [headerReady]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motion || !matchMedia("(pointer:fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.querySelector(".orbit-pinned")!.getBoundingClientRect();
        el.style.setProperty("--pointer-x", `${event.clientX - r.left}px`);
        el.style.setProperty("--pointer-y", `${event.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
    };
  }, [motion]);
  const loaded = useCallback(() => {
      setReady(true);
      window.dispatchEvent(
        new CustomEvent("agrorithm:scene-ready", {
          detail: { fallback: false },
        }),
      );
    }, []),
    fail = useCallback(() => {
      setFailed(true);
      window.dispatchEvent(
        new CustomEvent("agrorithm:scene-ready", {
          detail: { fallback: true },
        }),
      );
    }, []);
  const phase =
    progress < 0.22
      ? "A new perspective"
      : progress < 0.66
        ? "Turn toward your ground"
        : progress < 0.88
          ? "From orbit to an atlas"
          : "Find your place";
  const titleOpacity = motion ? Math.max(0, 1 - (progress - 0.2) / 0.2) : 1,
    atlasOpacity = motion
      ? Math.max(0, Math.min(1, (progress - 0.8) / 0.12))
      : 0;
  return (
    <section
      ref={ref}
      className={`orbit-opening ${motion ? "" : "orbit-static"}`}
      aria-label="Earth to satellite atlas opening"
      data-intro-bypass={headerReady ? "true" : "false"}
      data-intro-ended={progress >= 0.94 ? "true" : "false"}
    >
      <div
        className="orbit-pinned"
        style={
          {
            "--frame-inset": `${Math.max(0, 1 - progress / 0.66) * (matchMedia("(max-width:760px)").matches ? 12 : 32)}px`,
            "--frame-radius": `${Math.max(0, 1 - progress / 0.66) * 30}px`,
          } as CSSProperties
        }
      >
        <div className="orbit-backdrop" />
        <div
          className="orbit-guide"
          aria-hidden="true"
          style={{ opacity: Math.max(0, 1 - progress * 1.8) }}
        >
          <i />
          <i />
          <span>01 / PERSPECTIVE</span>
        </div>
        <div
          className="orbit-canvas"
          aria-label="Illustrative Earth rotation into a historical satellite map"
        >
          {(!ready || failed || quality === "static") && (
            <div className="earth-poster">
              <img
                src={asset("images/earth-poster.webp")}
                alt="NASA VTAD Earth with Clouds model, with illustrative lighting"
              />
            </div>
          )}
          {quality !== "static" && !failed && (
            <EarthBoundary onFail={fail}>
              <Suspense fallback={null}>
                <EarthCanvas
                  progress={progress}
                  motion={motion}
                  visible={visible}
                  onReady={loaded}
                  onFail={fail}
                />
              </Suspense>
            </EarthBoundary>
          )}
        </div>
        <div className="orbit-meta">
          <span>
            NASA EARTH OBSERVATIONS <i /> {BRAND.name.toUpperCase()}
          </span>
          <span>
            <b>
              {String(progress < 0.22 ? 1 : progress < 0.66 ? 2 : 3).padStart(
                2,
                "0",
              )}
            </b>{" "}
            / {phase}
          </span>
        </div>
        {!headerReady && (
          <button
            className="orbit-skip-intro"
            onClick={() => setIntroSkipped(true)}
          >
            Skip intro <ArrowDown size={13} />
          </button>
        )}
        <div
          className="orbit-title"
          style={{
            opacity: titleOpacity,
            transform: `translateY(${-progress * 70}px)`,
            pointerEvents: titleOpacity > 0.2 ? "auto" : "none",
          }}
        >
          <span className="eyebrow">
            <i /> A NEW PERSPECTIVE ON YOUR FIELD
          </span>
          <h1>
            {BRAND.headline.lead}
            <br />
            <em>{BRAND.headline.emphasis}</em>
          </h1>
          <p>
            Plan crop rotations with NASA observations.
            <br />
            Compare your soil, water and farming priorities.
            <br />
            Explore scenarios—not yield forecasts.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => start(false)}>
              {lang === "ur" ? "منصوبہ شروع کریں" : "Start planning"}
              <ArrowUpRight size={19} />
            </button>
            <button className="text-action" onClick={() => start(true)}>
              Try a sample farm
              <ArrowRight size={17} />
            </button>
          </div>
          {saved && (
            <button className="resume" onClick={resume}>
              Resume your saved plan
              <ArrowRight size={15} />
            </button>
          )}
          <div className="orbit-shortcuts" aria-label="Explore Agrorithm">
            <a href="#/atlas">
              <Compass size={15} /> Satellite atlas <ArrowUpRight size={14} />
            </a>
            <a href="#/soil">
              <Layers size={15} /> Beneath the surface{" "}
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div
          className="orbit-atlas-copy"
          style={{
            opacity: atlasOpacity,
            pointerEvents: atlasOpacity > 0.7 ? "auto" : "none",
          }}
        >
          <span className="eyebrow">
            <MapPin size={15} /> YOUR NEXT CHAPTER STARTS WITH A PLACE
          </span>
          <h2>
            The whole Earth.
            <br />
            <em>Your ground.</em>
          </h2>
          <a className="primary" href="#/atlas">
            Open the satellite atlas
            <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="orbit-bottom">
          <span>
            <ArrowDown size={15} />
            {motion
              ? "Scroll to rotate Earth and open the map"
              : "Reduced motion · static Earth view"}
          </span>
          <small>
            NASA VTAD globe · 2004 map · illustrative Sun and motion
          </small>
          <a href="#/atlas">
            Skip to map
            <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="orbit-progress" aria-hidden="true">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        {motion && (
          <div className="orbit-cursor" aria-hidden="true">
            <i />
            <span>SCROLL</span>
          </div>
        )}
      </div>
    </section>
  );
}
