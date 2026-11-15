import { useRef, useState, useEffect } from "react";
import { ArrowUpRight, Sprout, Move3D } from "lucide-react";
import { ATLAS_CROPS, type AtlasCropId } from "../data/atlas";
import { CROP_GROUPS, groupForCrop } from "../data/cropGroups";
import { asset, cropAsset } from "../config";
import ModelStage, { useScrollProgress } from "../components/ModelStage";
import CropProfile from "../components/CropProfile";
import { Search } from "lucide-react";
export default function CropLibrary({
  motion,
  quality,
  onPlanCrop,
}: {
  motion: boolean;
  quality: string;
  onPlanCrop: (crop: AtlasCropId) => void;
}) {
  const initial =
    new URLSearchParams(location.hash.split("?")[1]).get("crop") ||
    sessionStorage.getItem("agrorithm-crop");
  const [crop, setCrop] = useState<AtlasCropId>(
    ATLAS_CROPS.some((c) => c.id === initial)
      ? (initial as AtlasCropId)
      : "maize",
  );
  const group = groupForCrop(crop);
  const [query, setQuery] = useState("");
  const story = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(story, motion);
  useEffect(() => {
    try {
      sessionStorage.setItem("agrorithm-crop", crop);
    } catch {
      /* Current selection remains usable without storage. */
    }
  }, [crop]);
  const c = ATLAS_CROPS.find((c) => c.id === crop)!;
  const choose = (id: AtlasCropId) => setCrop(id);
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
      <div className="crop-showcase immersive-crop-story">
        <div className="crop-model-journey" ref={story}>
          <div className="crop-sticky-model">
            <ModelStage
              url={`models/crops/${cropAsset(crop)}.glb`}
              poster={`images/crops/${cropAsset(crop)}.webp`}
              title={`${group.name} representative preview`}
              motion={motion}
              quality={quality}
              progress={progress}
              annotations={[
                {
                  id: "foliage",
                  title:
                    group.name === "Fruit trees"
                      ? "Canopy structure"
                      : "Leaf structure",
                  detail: group.note,
                  node: "Leaves",
                },
                {
                  id: "fruit",
                  title:
                    group.name === "Grains"
                      ? "Reproductive structures"
                      : group.name === "Pulses"
                        ? "Flowers and pods"
                        : "Fruiting structures",
                  detail:
                    "Illustrative " + group.example + " group representative",
                  node:
                    group.model === "maize"
                      ? "Kernels"
                      : group.model === "mungbean"
                        ? "Pods"
                        : "Fruit",
                },
              ]}
            />
          </div>
        </div>
        <div className="plant-description">
          <span className="eyebrow">
            <Move3D size={15} /> SCROLL TO EXPLORE · DRAG TO INSPECT
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
          <button className="primary crop-plan-button" onClick={() => onPlanCrop(crop)}>
            <img src={asset(`images/crops/${cropAsset(crop)}-thumb.webp`)} alt="" />
            Plan with {c.name.toLowerCase()} <ArrowUpRight size={17} />
          </button>
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
        </div>
      </div>
      <CropProfile crop={crop} />
    </main>
  );
}
