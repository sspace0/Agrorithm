import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUpRight, ArrowRight, MapPin } from "lucide-react";
import { asset, BRAND } from "../config";
import { useScrollProgress } from "./ModelStage";
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  const loaded = useCallback(() => setReady(true), []),
    fail = useCallback(() => setFailed(true), []);
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
    >
      <div className="orbit-pinned">
        <div className="orbit-backdrop" />
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
          <span>NASA EARTH OBSERVATIONS · AGRORITHM</span>
          <span>{phase}</span>
        </div>
        <div
          className="orbit-title"
          style={{
            opacity: titleOpacity,
            transform: `translateY(${-progress * 70}px)`,
            pointerEvents: titleOpacity > 0.2 ? "auto" : "none",
          }}
        >
          <span className="eyebrow">A NEW PERSPECTIVE ON YOUR FIELD</span>
          <h1>
            {BRAND.headline.lead}
            <br />
            <em>{BRAND.headline.emphasis}</em>
          </h1>
          <p>
            Your soil has a story.
            <br />
            Explore its next chapter with NASA data.
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
      </div>
    </section>
  );
}
