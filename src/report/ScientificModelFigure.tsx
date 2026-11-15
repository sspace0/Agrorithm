import { asset } from "../config";

/** Fixed layout keeps the illustrative geometry and its scientific limits together. */
export default function ScientificModelFigure() {
  return <div className="agr-model-figure">
    <div className="agr-model-pair">
      <figure className="agr-model-panel">
        <span className="agr-model-kicker">01 / SHALLOW ROOT ZONE</span>
        <h3>Life above. Structure below.</h3>
        <img src={asset("images/root-zone-v2.webp")} width="1600" height="1250" alt="Illustrative cereal canopy, branching roots and irregular soil horizons in the actual Blender root-zone cutaway render" />
        <figcaption><strong>Depth context · approximately 0-2 m</strong><span>Demo boundaries around 0.39, 1.13 and 2.02 m. Plant density, roots and layers are illustrative; real horizons vary.</span></figcaption>
      </figure>
      <figure className="agr-model-panel">
        <span className="agr-model-kicker">02 / UNCONFINED GROUNDWATER EXAMPLE</span>
        <h3>Water within solid material.</h3>
        <img src={asset("images/groundwater-v2.webp")} width="1600" height="1250" alt="Actual Blender groundwater cutaway render showing solid sediment, a blue water-table boundary and small water markers within pores and fractures" />
        <figcaption><strong><i className="agr-water-key" />0-20 m conceptual scale · scale break</strong><span>Water table at 7 m is a demo assumption. Blue markers represent water in pores/fractures, not an underground cavity.</span></figcaption>
      </figure>
    </div>
    <div className="agr-model-disclosures">
      <div><h3>Observed / measured</h3><p>Evidence tables identify observations and any entered soil tests. No field layer or water-table depth is measured in these pictures.</p></div>
      <div><h3>Modeled scenario</h3><p>The root-zone water account screens the entered rotation and weather assumptions. It does not simulate aquifer dynamics.</p></div>
      <div><h3>Illustrative geometry</h3><p>Both renders come from the editable project scenes. Their matching framing does not imply equal depth or a measured Punjab soil profile.</p></div>
    </div>
  </div>;
}
