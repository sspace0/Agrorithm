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
import {
  Eye,
  Play,
  Plus,
  Minus,
  RotateCcw,
  Move3D,
  ArrowDown,
} from "lucide-react";
import { asset } from "../config";
import type {
  ModelCommands,
  SceneAnnotation,
  SceneOptions,
} from "./ModelScene";
const Scene = lazy(() => import("./ModelScene"));
class SceneBoundary extends Component<
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
export function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  enabled = true,
  pinnedOpening = false,
) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      return;
    }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (r)
          setProgress(
            Math.max(
              0,
              Math.min(
                1,
                (pinnedOpening ? 106 - r.top : innerHeight * 0.22 - r.top) /
                  Math.max(
                    1,
                    r.height -
                      (pinnedOpening
                        ? (ref.current?.firstElementChild?.getBoundingClientRect()
                            .height ?? innerHeight - 106)
                        : innerHeight * 0.65),
                  ),
              ),
            ),
          );
      });
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [ref, enabled, pinnedOpening]);
  return progress;
}
export default function ModelStage({
  url,
  poster,
  title,
  motion,
  quality,
  progress = 0,
  options = {},
  annotations = [],
  resetKey = 0,
  interactive = true,
  compact = false,
  auto = true,
  onAssetReady,
}: {
  url: string;
  poster: string;
  title: string;
  motion: boolean;
  quality: string;
  progress?: number;
  options?: SceneOptions;
  annotations?: SceneAnnotation[];
  resetKey?: number;
  interactive?: boolean;
  compact?: boolean;
  auto?: boolean;
  onAssetReady?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false),
    [visible, setVisible] = useState(true),
    [requested, setRequested] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [percent, setPercent] = useState<number | null>(null),
    [manual, setManual] = useState(false),
    [posterMissing, setPosterMissing] = useState(false);
  const commands = useRef<ModelCommands | null>(null);
  const low = quality === "low" || matchMedia("(max-width:760px)").matches;
  const constrained =
    matchMedia("(max-width:760px)").matches ||
    !!(navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData;
  const active =
    quality !== "static" &&
    !failed &&
    near &&
    (requested || (auto && !constrained));
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    setHost(el);
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setNear(true);
        setVisible(e.isIntersecting && !document.hidden);
      },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    setReady(false);
    setPercent(null);
    setFailed(false);
    setPosterMissing(false);
    setManual(false);
    commands.current = null;
  }, [url]);
  useEffect(() => {
    if (quality === "static") {
      setRequested(false);
      setReady(false);
    }
  }, [quality]);
  const onReady = useCallback(() => {
    setReady(true);
    setPercent(1);
    onAssetReady?.();
  }, [onAssetReady]);
  const onFail = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  const onCommands = useCallback((v: ModelCommands) => {
    commands.current = v;
  }, []);
  const onProgress = useCallback((v: number | null) => setPercent(v), []);
  return (
    <section
      className={`model-presentation ${compact ? "model-compact" : ""}`}
      aria-label={title}
      data-model-url={url}
    >
      <div
        className="model-viewport scene-window"
        ref={container}
        data-model-stage
        data-camera-mode={manual ? "manual" : "scroll"}
      >
        {!posterMissing ? (
          <img
            className="model-poster poster"
            src={asset(poster)}
            alt={title}
            onError={() => setPosterMissing(true)}
            style={{ opacity: ready && active ? 0 : 1 }}
          />
        ) : (
          <div className="model-poster-missing">
            <Move3D />
            <span>Model preview unavailable</span>
          </div>
        )}
        {active && (
          <SceneBoundary key={url} onFail={onFail}>
            <Suspense fallback={null}>
              <div className="model-canvas">
                <Scene
                  key={url}
                  url={asset(url)}
                  motion={motion}
                  low={low}
                  visible={visible}
                  progress={progress}
                  options={options}
                  annotations={annotations}
                  resetKey={resetKey}
                  interactive={interactive}
                  onReady={onReady}
                  onFail={onFail}
                  onProgress={onProgress}
                  onManual={setManual}
                  onCommands={onCommands}
                  host={host}
                />
              </div>
            </Suspense>
          </SceneBoundary>
        )}
        {!ready && active && !failed && (
          <div className="model-loading" role="status">
            <img src={asset("images/agrorithm-logo.png")} alt="Agrorithm" />
            <span>
              {percent === null
                ? "Preparing 3D scene…"
                : `Loading model · ${Math.round(percent * 100)}%`}
            </span>
            <div
              className={
                percent === null ? "load-track indeterminate" : "load-track"
              }
            >
              {percent !== null && <i style={{ width: `${percent * 100}%` }} />}
            </div>
          </div>
        )}
        <div className="model-annotations" aria-hidden="true">
          {ready &&
            active &&
            annotations.map((a) => (
              <div
                key={a.id}
                data-annotation={a.id}
                className="model-annotation"
              >
                <strong>{a.title}</strong>
                <small>{a.detail}</small>
              </div>
            ))}
        </div>
        <span className="model-status">
          {options.view === "groundwater"
            ? "Conceptual depth 0–20 m · scale break"
            : options.view
              ? "Illustrative soil profile · 0–2 m"
              : "Representative geometry · normalized display scale"}
        </span>
        <div className="model-toolbar" aria-label={`${title} camera controls`}>
          {!active && quality !== "static" && !failed ? (
            <button className="primary" onClick={() => setRequested(true)}>
              <Play size={15} />
              Explore in 3D
            </button>
          ) : active && ready ? (
            <>
              <button
                onClick={() =>
                  manual
                    ? commands.current?.resume()
                    : commands.current?.inspect()
                }
                aria-pressed={manual}
              >
                <Move3D size={15} />
                {manual ? "Resume scroll" : "Inspect model"}
              </button>
              <button
                onClick={() => commands.current?.zoom(0.68)}
                aria-label="Zoom model in"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => commands.current?.zoom(1.48)}
                aria-label="Zoom model out"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => commands.current?.reset()}
                aria-label="Reset model view"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => {
                  setRequested(false);
                  setReady(false);
                  setFailed(true);
                }}
                aria-label="Show model poster"
              >
                <Eye size={16} />
              </button>
            </>
          ) : null}
        </div>
        {failed && (
          <div className="model-fallback" role="status">
            3D is unavailable or paused. The poster and all planning tools
            remain available.
            <button
              onClick={() => {
                setFailed(false);
                setRequested(true);
              }}
            >
              Reload 3D
            </button>
          </div>
        )}
      </div>
      {!compact && (
        <>
          <div className="model-interaction-note">
            <ArrowDown size={14} />
            {manual
              ? "Manual camera · drag to orbit, right-drag to pan, Ctrl + wheel to zoom. Resume scroll restores the guided camera."
              : "Scroll to reveal the model. Drag pauses the guided camera. Ctrl + wheel zooms toward the pointer; ordinary scrolling stays on the page."}
          </div>
          <details className="model-description-toggle">
            <summary>Model labels & scientific context</summary>
            <div
              className="model-text-alternative"
              aria-label="Model descriptions"
            >
              {annotations.map((a) => (
                <div key={a.id}>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}
