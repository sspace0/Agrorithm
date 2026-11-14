import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Play,
  RotateCcw,
  Sprout,
  Eye,
  Move3D,
} from "lucide-react";
import { ATLAS_CROPS, type AtlasCropId } from "../data/atlas";
import { CROP_GROUPS, groupForCrop } from "../data/cropGroups";
import { asset, cropAsset } from "../config";
import CropProfile from "../components/CropProfile";
import { Search } from "lucide-react";
const CropCanvas = lazy(() => import("../components/CropCanvas"));
class PlantBoundary extends Component<
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
export default function CropLibrary({
  motion,
  quality,
}: {
  motion: boolean;
  quality: string;
}) {
  const initial = new URLSearchParams(location.hash.split("?")[1]).get("crop");
  const [crop, setCrop] = useState<AtlasCropId>(
    ATLAS_CROPS.some((c) => c.id === initial)
      ? (initial as AtlasCropId)
      : "maize",
  );
  const group = groupForCrop(crop);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [reset, setReset] = useState(0);
  useEffect(() => {
    setActive(false);
    setReady(false);
  }, [quality]);
  const onReady = useCallback(() => setReady(true), []),
    onFail = useCallback(() => {
      setFailed(true);
      setActive(false);
    }, []);
  const c = ATLAS_CROPS.find((c) => c.id === crop)!;
  const choose = (id: AtlasCropId) => {
    setCrop(id);
    setActive(false);
    setReady(false);
    setFailed(false);
  };
  return (
    <main className="standalone crop-library">
      <span className="eyebrow">
        <Sprout size={17} /> THE CROP LIBRARY
      </span>
      <div className="library-heading">
        <h1>
          Explore crop options.
          <br />
          <em>Look a little closer.</em>
        </h1>
        <p>
          Four representative 3D models, eight crop references. Explore plant
          form, then check climate, soil and water needs. Category models are
          illustrative; they do not depict every species.
        </p>
      </div>
      <nav className="soil-subnav" aria-label="3D explorer pages">
        <a href="#/soil">
          <Sprout size={16} />
          Soil & water
        </a>
        <a href="#/crops" aria-current="page">
          <Move3D size={16} />
          Crop models
        </a>
      </nav>
      <label className="guide-search crop-search">
        <Search size={20} />
        <input
          type="search"
          aria-label="Search crop references"
          placeholder="Find wheat, chickpea, mango…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {query.trim() && (
        <div className="profile-picks crop-search-results" role="status">
          {ATLAS_CROPS.filter((c) =>
            `${c.name} ${c.latin}`.toLowerCase().includes(query.toLowerCase()),
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                choose(c.id);
                setQuery("");
              }}
            >
              <img
                src={asset(`images/crops/${cropAsset(c.id)}-thumb.webp`)}
                alt=""
              />
              {c.name}
            </button>
          ))}
          {!ATLAS_CROPS.some((c) =>
            `${c.name} ${c.latin}`.toLowerCase().includes(query.toLowerCase()),
          ) && (
            <p>No crop matches. Try a name from the eight references below.</p>
          )}
        </div>
      )}
      <div className="crop-picks" aria-label="Choose a crop group">
        {CROP_GROUPS.map((g) => (
          <button
            key={g.id}
            aria-pressed={group.id === g.id}
            onClick={() => choose(g.crops[0])}
          >
            <img src={asset(`images/crops/${g.model}-thumb.webp`)} alt="" />
            <span>
              {g.name}
              <small>
                {g.crops
                  .map((id) => ATLAS_CROPS.find((c) => c.id === id)!.name)
                  .join(" · ")}
              </small>
            </span>
          </button>
        ))}
      </div>
      <div className="crop-showcase">
        <section
          className="plant-stage"
          aria-label={`${group.name} representative preview`}
        >
          <img
            className="plant-poster"
            src={asset(`images/crops/${cropAsset(crop)}.webp`)}
            alt={`Illustrative ${group.example} plant representing ${group.name}`}
            style={{
              opacity:
                ready && active && !failed && quality !== "static" ? 0 : 1,
            }}
          />
          {active && !failed && quality !== "static" && (
            <PlantBoundary key={`${crop}-${reset}`} onFail={onFail}>
              <Suspense fallback={null}>
                <CropCanvas
                  crop={crop}
                  motion={motion}
                  low={
                    quality !== "auto" ||
                    matchMedia("(max-width:760px)").matches
                  }
                  onReady={onReady}
                  onLost={onFail}
                />
              </Suspense>
            </PlantBoundary>
          )}
          <span className="plant-scale">
            1.5 m presentation height · illustrative, not a botanical
            measurement
          </span>
          <div className="plant-actions">
            {!active ? (
              <button
                className="primary"
                disabled={quality === "static"}
                onClick={() => setActive(true)}
              >
                <Play size={16} />
                Explore in 3D
              </button>
            ) : (
              <>
                <button onClick={() => setReset(reset + 1)}>
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button
                  onClick={() => {
                    setActive(false);
                    setReady(false);
                  }}
                >
                  <Eye size={16} />
                  Poster view
                </button>
              </>
            )}
          </div>
          {active && !ready && (
            <span className="plant-loading" role="status">
              Loading this plant only…
            </span>
          )}
        </section>
        <div className="plant-description">
          <span className="eyebrow">
            <Move3D size={15} />{" "}
            {active ? "DRAG / PINCH TO EXPLORE" : "LIGHTWEIGHT POSTER PREVIEW"}
          </span>
          <h2>{group.name}</h2>
          <p className="representative-note">{group.note}</p>
          <div className="profile-picks">
            {group.crops.map((id) => (
              <button
                key={id}
                aria-pressed={crop === id}
                onClick={() => choose(id)}
              >
                <img
                  src={asset(`images/crops/${cropAsset(id)}-thumb.webp`)}
                  alt=""
                />
                {ATLAS_CROPS.find((c) => c.id === id)!.name}
              </button>
            ))}
          </div>
          <h3>{c.name} reference</h3>
          <span className="latin-name">{c.latin}</span>
          <p>{c.climate}</p>
          <h3>Ground & water</h3>
          <p>{c.soil}</p>
          <p>{c.water}</p>
          <a className="text-action" href="#/atlas">
            Find its climate context <ArrowUpRight size={16} />
          </a>
          <a className="text-action" href="#/soil">
            Explore roots & soil <ArrowUpRight size={16} />
          </a>
          <a
            className="guide-source"
            target="_blank"
            rel="noreferrer"
            href={c.source}
          >
            Crop reference <ArrowUpRight size={14} />
          </a>
          {failed && (
            <p role="status" className="warning">
              3D is unavailable. The poster and all crop information remain
              usable.
            </p>
          )}
          {quality === "static" && (
            <p className="note">
              Static quality is selected. Change graphics quality to enable
              optional 3D.
            </p>
          )}
        </div>
      </div>
      <CropProfile crop={crop} />
    </main>
  );
}
