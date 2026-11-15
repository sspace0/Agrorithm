import { ArrowUpRight, CheckCircle2, Clock3, Database, Info, Satellite } from "lucide-react";
import "./nasaScope.css";

const unusedSources = [
  ["SMAP", "No SMAP moisture product is loaded or used in the results."],
  ["GPM / IMERG", "Rainfall currently comes from POWER; no IMERG rainfall series is used."],
  ["ECOSTRESS", "No ECOSTRESS evapotranspiration or thermal-stress product is used."],
  ["GRACE / GRACE-FO", "No terrestrial-water-storage product or field water-table estimate is used."],
  ["SRTM", "No terrain elevation, slope or runoff calculation uses SRTM."],
  ["HLS S30", "The shipped vegetation record is L30 only; no Sentinel-derived S30 observations are included."],
] as const;

const futurePowerParameters = [
  ["RH2M", "Relative humidity at 2 m", "%"],
  ["QV2M", "Specific humidity at 2 m", "g/kg"],
  ["GWETTOP", "Surface soil wetness", "dimensionless fraction, 0–1"],
  ["GWETROOT", "Root-zone soil wetness", "dimensionless fraction, 0–1"],
  ["GWETPROF", "Profile soil wetness", "dimensionless fraction, 0–1"],
] as const;

/** The source inventory describes implemented integrations, not a provider catalog. */
export function NasaScopePanel({ evidenceHref = "#/studio/evidence" }: { evidenceHref?: string }) {
  return <section className="nasa-scope-panel" aria-label="NASA data in this tool" data-testid="nasa-scope-panel">
    <header className="nasa-scope-heading"><span><Satellite size={19} aria-hidden="true" /> Source scope</span><h2>NASA data in this tool</h2><p>Two NASA data integrations are implemented: POWER weather and HLS L30 vegetation. Each has a defined role, date window and spatial limit.</p></header>
    <div className="nasa-scope-implemented">
      <article data-nasa-source="power" data-status="implemented">
        <span className="nasa-scope-status"><CheckCircle2 size={16} aria-hidden="true" /> Implemented · numerical input</span>
        <h3>POWER / MERRA-2</h3>
        <strong>Bundled sample: 2018-01-01 → 2024-12-31</strong>
        <p>2,557 daily records for the regional Punjab example. Minimum / maximum temperature (°C) and corrected precipitation (mm/day), requested in UTC. The meteorological source grid is about 0.50° × 0.63°, rather than a field measurement.</p>
        <p><b>Used for:</b> reference ET, stage-specific crop ET, root-zone water screening, delivered irrigation and historical heat / frost / rainfall-deficit exposure.</p>
        <a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA POWER daily service <ArrowUpRight size={15} aria-hidden="true" /></a>
      </article>
      <article data-nasa-source="hls-l30" data-status="implemented">
        <span className="nasa-scope-status"><CheckCircle2 size={16} aria-hidden="true" /> Implemented · observed context</span>
        <h3>HLS L30 v2.0</h3>
        <strong>Acquisitions: 2023-01-05 → 2023-12-31</strong>
        <p>NASA / USGS reflectance, accessed through the documented Microsoft mirror. The 30 m, 9 × 9 pixel regional footprint has 43 scenes; 16 pass the 50% valid-footprint threshold. Retrieved 2026-11-14.</p>
        <p><b>Used for:</b> quality-filtered NDVI and farmer confirmation of live-cover context. It does not automatically change numerical rotation scores or establish crop identity, residue, nutrients or soil carbon.</p>
        <a href="https://hls.gsfc.nasa.gov/data-products/" target="_blank" rel="noreferrer">NASA HLS products <ArrowUpRight size={15} aria-hidden="true" /></a>
      </article>
    </div>
    <p className="nasa-scope-basemap"><Info size={18} aria-hidden="true" /><span><strong>Visual basemap, separate from the decision inputs.</strong> NASA Blue Marble’s August 2004 composite supplies the Earth / atlas imagery. Its appearance is not live field evidence and does not determine crop suitability.</span></p>
    <div className="nasa-scope-unused"><h3><Clock3 size={19} aria-hidden="true" /> Not used in the current results</h3><p>These products are not connected to the decision engine or shipped observation sample. Listing them here is a scope disclosure, not an integration claim.</p><div className="nasa-scope-unused-grid">{unusedSources.map(([name, description]) => <article key={name} data-nasa-source={name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")} data-status="not-used"><span>Not used</span><h4>{name}</h4><p>{description}</p></article>)}</div></div>
    <details className="nasa-scope-future"><summary><Database size={18} aria-hidden="true" /> POWER parameters verified for possible later work</summary><p>Provider metadata was checked on 15 November 2026. The following parameters are <strong>not downloaded, displayed as observations or used in calculations</strong> in this release.</p><dl>{futurePowerParameters.map(([id, meaning, unit]) => <div key={id}><dt>{id}</dt><dd>{meaning}<strong>{unit}</strong></dd></div>)}</dl><p>POWER’s metadata includes modeled MERRA-2 / GEOS-IT wetness and optional SMAP pathways. A future request must record its actual source and depth. A wetness fraction is not millimetres of available storage, volumetric moisture or a field water-table depth; it must not be relabeled as SMAP.</p><a href="https://power.larc.nasa.gov/parameters/" target="_blank" rel="noreferrer">NASA POWER parameter dictionary <ArrowUpRight size={15} aria-hidden="true" /></a></details>
    <aside className="nasa-scope-fallback"><Info size={21} aria-hidden="true" /><div><h3>When a data service or download is unavailable</h3><p>The bundled dated sample remains available offline after caching. Failed live weather requests preserve the current record. Missing or poor-quality satellite observations remain gaps; no replacement NDVI is invented. Use manual inputs / JSON imports or review the cached regional sample.</p><a href={evidenceHref}>Open evidence and manual imports <ArrowUpRight size={17} aria-hidden="true" /></a></div></aside>
  </section>;
}

export default NasaScopePanel;
