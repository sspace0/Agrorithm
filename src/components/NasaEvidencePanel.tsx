import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, FlaskConical, Layers3, Satellite } from "lucide-react";
import type { Day } from "../engine/types";
import { formatNumber } from "../engine/format";
import { NASA_RESULT_ROLES, SOIL_HEALTH_PROXY_NOTE, summarizeNasaEvidence, type VegetationEvidence } from "../engine/evidenceSummary";
import "./nasaEvidence.css";

type Props = {
  weather: Day[];
  weatherSource: string;
  vegetation: VegetationEvidence | null;
  weatherRetrieved?: string;
  weatherMatchesFarm?: boolean;
  vegetationMatchesFarm?: boolean;
  onOpenEvidence?: () => void;
  onUseSample?: () => void;
  showOrigins?: boolean;
  showSoilNote?: boolean;
};
const range = (start: string | null, end: string | null) => start && end ? `${start} → ${end}` : "No dated observations available";

export function WeatherDataStrip({ weather, weatherSource, vegetation, weatherMatchesFarm, vegetationMatchesFarm, onOpenEvidence }: Pick<Props, "weather" | "weatherSource" | "vegetation" | "weatherMatchesFarm" | "vegetationMatchesFarm" | "onOpenEvidence">) {
  const summary = summarizeNasaEvidence(weather, weatherSource, vegetation);
  const needsAttention = !summary.weather.available || !summary.vegetation.available || weatherMatchesFarm === false || vegetationMatchesFarm === false || summary.weather.origin !== "nasa";
  return <section className="weather-data-strip" aria-label="Observation dates used in these results" data-testid="weather-data-strip">
    <div className="weather-strip-heading"><strong><Satellite size={18} aria-hidden="true" /> Data & method</strong>{onOpenEvidence && <button type="button" onClick={onOpenEvidence}>View sources <ArrowUpRight size={16} aria-hidden="true" /></button>}</div>
    <div className="weather-strip-datasets">
      <div data-available={summary.weather.available && weatherMatchesFarm !== false}><span>{summary.weather.origin === "nasa" ? "NASA POWER / MERRA-2" : summary.weather.origin === "user" ? "User-imported weather" : "Weather source unverified"}</span><strong>{range(summary.weather.start, summary.weather.end)}</strong><p>{summary.weather.available ? "Temperature + rain drive irrigation and historical weather-exposure estimates." : "Weather-dependent estimates remain unresolved without complete records."}</p></div>
      <div data-available={summary.vegetation.available && vegetationMatchesFarm !== false}><span>{vegetation ? `NASA / USGS ${vegetation.product} v${vegetation.version}` : "NASA / USGS HLS vegetation"}</span><strong>{range(summary.vegetation.start, summary.vegetation.end)}</strong><p>{summary.vegetation.available ? `${summary.vegetation.acceptedScenes} / ${summary.vegetation.scenes} scenes pass QA. Vegetation context; scenario cover remains calendar-based.` : "No quality-passing scenes; satellite-confirmed live cover stays unknown."}</p></div>
    </div>
    {needsAttention && <p className="weather-strip-alert"><AlertTriangle size={17} aria-hidden="true" /> {weatherMatchesFarm === false || vegetationMatchesFarm === false ? "A source footprint differs from the selected field. Check the evidence before interpreting these results." : summary.weather.origin !== "nasa" ? "Imported or unverified weather is not relabeled as NASA data. Verify units, time standard and footprint." : "Some evidence is missing. Cached data or manual inputs can keep planning available; missing observations are not invented."}</p>}
    <p className="weather-strip-limit"><strong>Limits:</strong> pilot weather grid ≈50–60 km; bundled example soil values are assumptions. HLS uses a separate 30 m footprint. Observations stop at the dates shown; scenarios are not forecasts.</p>
  </section>;
}

export function EvidenceOriginLegend() {
  return <div className="evidence-origins" aria-label="How to interpret the evidence">
    <div data-origin="observed"><Satellite size={18} aria-hidden="true" /><strong>NASA observations</strong><p>Historical gridded weather and quality-filtered reflectance; dates and spatial footprints apply.</p></div>
    <div data-origin="farmer"><ClipboardList size={18} aria-hidden="true" /><strong>Farmer inputs</strong><p>Field location, dates, soil tests, water supply and management; unknown answers stay unknown.</p></div>
    <div data-origin="assumed"><Layers3 size={18} aria-hidden="true" /><strong>Assumptions</strong><p>Provisional crop parameters, effective rain, starting storage and residue duration need local checking.</p></div>
    <div data-origin="modeled"><FlaskConical size={18} aria-hidden="true" /><strong>Model estimates</strong><p>ET, irrigation, historical exposure and scenario cover are calculated screens; they are not measurements or forecasts.</p></div>
  </div>;
}

export function SoilHealthNote() {
  return <aside className="soil-health-note" aria-label="Soil-health interpretation">
    <span className="evidence-kicker"><FlaskConical size={17} aria-hidden="true" /> Interpretation limit</span>
    <h3>{SOIL_HEALTH_PROXY_NOTE.title}</h3>
    <p>{SOIL_HEALTH_PROXY_NOTE.proxies}</p>
    <p><strong>What they miss. </strong>{SOIL_HEALTH_PROXY_NOTE.limits}</p>
    <details><summary>What evidence would we add next?</summary><p>{SOIL_HEALTH_PROXY_NOTE.next}</p></details>
  </aside>;
}

export function NasaEvidencePanel({ weather, weatherSource, vegetation, weatherRetrieved, weatherMatchesFarm, vegetationMatchesFarm, onOpenEvidence, onUseSample, showOrigins = true, showSoilNote = false }: Props) {
  const summary = summarizeNasaEvidence(weather, weatherSource, vegetation);
  const weatherMissing = !summary.weather.available;
  const satelliteMissing = !summary.vegetation.available;
  const locationMismatch = weatherMatchesFarm === false || vegetationMatchesFarm === false;
  return <section className="nasa-evidence-panel" aria-label="NASA data used in this plan" data-testid="nasa-evidence-panel">
    <div className="evidence-panel-heading"><div><span className="evidence-kicker"><Satellite size={18} aria-hidden="true" /> NASA data in this plan</span><h3>What the observations change</h3></div>{onOpenEvidence && <button type="button" onClick={onOpenEvidence}>Inspect the evidence <ArrowUpRight size={17} aria-hidden="true" /></button>}</div>
    <div className="evidence-datasets">
      <article className="evidence-dataset" data-dataset="power">
        <div className="evidence-dataset-title"><span className="evidence-source-chip">{summary.weather.origin === "nasa" ? "NASA · historical" : "Current weather input"}</span>{!weatherMissing && <CheckCircle2 size={17} aria-label="Dated data available" />}</div>
        <h4>{summary.weather.origin === "nasa" ? "POWER / MERRA-2" : "Weather source needs verification"}</h4>
        <strong className="evidence-date-range">{range(summary.weather.start, summary.weather.end)}</strong>
        <p className="evidence-coverage">{formatNumber(summary.weather.completeDays)} complete daily records / {formatNumber(summary.weather.totalDays)} dated records{summary.weather.origin === "nasa" ? " · UTC" : " · source time standard unverified"}</p>
        {summary.weather.origin === "nasa" ? <p>T2M_MIN / T2M_MAX (°C); PRECTOTCORR (mm/day). Regional meteorology grid about 0.50° latitude × 0.63° longitude, rather than a field sensor.</p> : <p>Imported columns are interpreted as daily minimum / maximum temperature (°C) and rainfall (mm/day). Verify their original units, time standard, publisher and spatial support before interpreting the calculations. No NASA product or grid is assumed for these rows.</p>}
        <p className="evidence-impact"><strong>Changes in the results. </strong>Drives ETo / crop ET, root-zone storage, net / delivered irrigation, and historical heat, frost and rainfall-deficit exposure.</p>
        <details className="evidence-method"><summary>How weather enters the calculation</summary><p>{NASA_RESULT_ROLES.weather}</p></details>
        <p className="evidence-retrieval">{weatherRetrieved ? `Retrieved ${weatherRetrieved}. ` : "Retrieval date not supplied separately. "}{weatherSource}</p>
        <a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">{summary.weather.origin === "nasa" ? "NASA POWER documentation" : "About the optional NASA POWER source"} <ArrowUpRight size={14} aria-hidden="true" /></a>
      </article>
      <article className="evidence-dataset" data-dataset="hls">
        <div className="evidence-dataset-title"><span className="evidence-source-chip">NASA / USGS · reflectance</span>{!satelliteMissing && <CheckCircle2 size={17} aria-label="Quality-filtered observations available" />}</div>
        <h4>{vegetation ? `${vegetation.product} v${vegetation.version}` : "HLS L30 vegetation record"}</h4>
        <strong className="evidence-date-range">{range(summary.vegetation.start, summary.vegetation.end)}</strong>
        <p className="evidence-coverage">{summary.vegetation.acceptedScenes} / {summary.vegetation.scenes} scenes pass the 50% valid-footprint threshold</p>
        <p>{vegetation ? `${vegetation.spatialSupport.shape.join(" × ")} pixels at ${formatNumber(vegetation.spatialSupport.pixelSizeM)} m; a regional footprint, not a surveyed field boundary.` : "No valid satellite footprint is loaded."} Fmask filtering removes cloud/shadow/snow/water and high aerosol; rejected scenes remain visible as gaps.</p>
        <p className="evidence-impact"><strong>Changes in the interpretation. </strong>Shows observed vegetation context for farmer cover confirmation. <strong>It does not automatically change rotation scores.</strong></p>
        <details className="evidence-method"><summary>What NDVI can and cannot establish</summary><p>{NASA_RESULT_ROLES.vegetation}</p></details>
        <p className="evidence-retrieval">{vegetation ? `Retrieved ${vegetation.retrieved || "date not supplied"}. ${vegetation.publisher}. DOI ${vegetation.doi}.` : "Satellite observation and retrieval dates are unavailable."}</p>
        <a href="https://hls.gsfc.nasa.gov/data-products/" target="_blank" rel="noreferrer">NASA HLS product documentation <ArrowUpRight size={14} aria-hidden="true" /></a>
      </article>
    </div>
    {(weatherMissing || satelliteMissing || locationMismatch || summary.weather.origin !== "nasa" || summary.vegetation.failures > 0) && <aside className="evidence-unavailable" role="status" data-testid="evidence-unavailable">
      <AlertTriangle size={22} aria-hidden="true" /><div><strong>{weatherMissing || satelliteMissing ? "Evidence is unavailable or incomplete" : "Check source coverage before using these results"}</strong>
        {weatherMissing && <p>No complete weather records are available. Irrigation and weather-exposure results stay unresolved; enter/import dated weather or restore the cached sample.</p>}
        {satelliteMissing && <p>No satellite scenes currently pass quality and coverage checks. No NDVI is invented. You can still enter the crop calendar and farmer observations; satellite-confirmed cover remains unknown.</p>}
        {locationMismatch && <p>A loaded footprint does not match the selected field. Moving the marker does not move the observation. Use the regional sample or load evidence for the new location.</p>}
        {summary.weather.origin !== "nasa" && !weatherMissing && <p>The current weather is user-imported or its provenance is unverified. Its rows are not relabeled as NASA observations.</p>}
        {summary.vegetation.failures > 0 && <p>{summary.vegetation.failures} satellite acquisition failure(s) are recorded. Review scene-level reasons in the evidence page.</p>}
        <div className="evidence-fallback-actions">{onOpenEvidence && <button type="button" onClick={onOpenEvidence}>Open data and manual import <ArrowUpRight size={17} aria-hidden="true" /></button>}{onUseSample && <button type="button" onClick={onUseSample}>Use the cached regional sample</button>}</div>
      </div>
    </aside>}
    <p className="evidence-limit-line"><strong>Historical, limited coverage.</strong> Observations stop on the dates shown. Weather perturbations and proposed rotations are hypothetical scenarios, never newer observations or forecasts.</p>
    {showOrigins && <EvidenceOriginLegend />}
    {showSoilNote && <SoilHealthNote />}
  </section>;
}
