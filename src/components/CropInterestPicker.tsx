import { ArrowDown, ArrowUpRight, Sprout } from "lucide-react";
import { ATLAS_CROPS } from "../data/atlas";
import { asset, cropAsset } from "../config";
import { cropInterestScope, withCropInterest } from "../engine/cropInterest";
import type { Farm } from "../engine/types";
import "../crop-plan.css";

export default function CropInterestPicker({ farm, onChange }: { farm: Farm; onChange: (farm: Farm) => void }) {
  const selected = ATLAS_CROPS.find(crop => crop.id === farm.cropInterest);
  const scope = selected ? cropInterestScope(selected.id) : null;
  return <section className="paper crop-plan-interest" aria-label="Crop selected for planning">
    <div className="crop-plan-choice">
      {selected ? <img src={asset(`images/crops/${cropAsset(selected.id)}-thumb.webp`)} alt="" /> : <Sprout size={35} />}
      <label><span>Crop to explore</span><select value={farm.cropInterest || ""} onChange={event => onChange(withCropInterest(farm, event.target.value))}>
        <option value="">No crop preference selected</option>
        {ATLAS_CROPS.map(crop => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
      </select></label>
    </div>
    {selected ? <div className="crop-plan-context" role="status">
      <strong>{selected.name} selected for your planning conversation.</strong>
      <p>{scope === "annual"
        ? "This crop is available in the annual rotation registry. Confirm its local parameters and enter real sowing and harvest dates in your existing sequence. Your crop choice does not change that sequence automatically."
        : scope === "perennial"
          ? "This is a perennial reference. Orchard establishment and bearing years are outside the annual 36-month rotation model. The choice is saved as an interest; no orchard rotation, yield or water result is inferred."
          : "This crop is a library reference. Region-specific calendar, soil, water, equipment and market parameters must be added and reviewed before it can enter this rotation engine. The choice is saved as an interest, with its feasibility unresolved."}</p>
      <div className="crop-plan-actions">
        {scope === "annual" && <button className="secondary" type="button" onClick={() => {
          const sequence = document.getElementById("field-sequence");
          sequence?.focus({ preventScroll: true });
          sequence?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
        }}>Review dates & crop sequence <ArrowDown size={16} /></button>}
        <a className="text-action" href={`#/crops?crop=${selected.id}`}>View {selected.name.toLowerCase()} reference <ArrowUpRight size={16} /></a>
      </div>
    </div> : <p className="note">Optional. Select a crop here or choose “Plan with” from the crop library. The baseline remains your entered rotation.</p>}
  </section>;
}
