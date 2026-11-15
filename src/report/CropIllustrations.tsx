import { asset } from "../config";
import type { Crop } from "../engine/types";

const images: Record<string, { file: string; description: string }> = {
  maize: { file: "maize", description: "Maize illustration from the project's editable Blender scene." },
  wheat: { file: "wheat", description: "Wheat illustration from the project's editable Blender scene." },
  mung: { file: "mungbean", description: "Mungbean illustration from the project's editable Blender scene." },
  cover: { file: "mungbean", description: "Shared legume illustration depicts mungbean; it does not depict the cover species or establish cover performance." },
  rice: { file: "rice", description: "Paddy rice illustration; additional paddy-water terms remain necessary." },
};
export default function CropIllustrations({ crops }: { crops: { id: string; crop: Crop }[] }) {
  return <div className="agr-crop-pair">{crops.map(({ id, crop }) => {
    const illustration = images[id];
    return <figure className="agr-crop-panel" key={id}>
      <div className="agr-crop-image">{illustration ? <img src={asset(`images/crops/${illustration.file}.webp`)} width="1250" height="1250" alt={illustration.description} /> : <span>Illustration not supplied for this imported crop.</span>}</div>
      <figcaption><h3 title={crop.name}>{crop.name.length > 70 ? `${crop.name.slice(0, 67)}…` : crop.name}</h3><strong>{crop.family} · {crop.legume ? "Legume" : "Non-legume"}</strong><p>{illustration?.description || "Use the full imported parameter register for this crop's supplied evidence."}</p><small>Illustrative geometry. Crop dates, water requirements and feasibility are documented separately.</small></figcaption>
    </figure>;
  })}</div>;
}
