import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BRAND, asset } from "../config";
import { sensitivity } from "../engine/engine";
import { CalendarChart, VegetationChart, WaterChart, WeatherChart } from "./ReportCharts";
import ScientificModelFigure from "./ScientificModelFigure";
import CropIllustrations from "./CropIllustrations";
import { ATLAS_CROPS } from "../data/atlas";
import { cropInterestScope } from "../engine/cropInterest";
import { cropRegistry, display, packMeasured, percent, REPORT_BODY_HEIGHT, REPORT_HORIZON, splitTableRow, splitText, summarizeWeather, type AgrorithmReportProps, type MeasuredItem } from "./reportData";
import "./report.css";
export type { AgrorithmReportProps, ReportSnapshot, ReportVegetation } from "./reportData";

type Block = { id: string; kind: "content"; node: ReactNode } | { id: string; kind: "row"; table: string; caption: string; columns: string[]; widths: number[]; cells: string[] };
type Section = { id: string; kicker: string; title: string; subtitle: string; blocks: Block[] };

function makeSection(id: string, kicker: string, title: string, subtitle: string) {
  const section: Section = { id, kicker, title, subtitle, blocks: [] };
  const content = (node: ReactNode) => section.blocks.push({ id: `${id}-${section.blocks.length}`, kind: "content", node });
  const paragraph = (heading: string, text: string) => splitText(text).forEach((part, i) => content(<div className="agr-copy"><h3>{heading}{i ? " (continued)" : ""}</h3><p>{part}</p></div>));
  const table = (caption: string, columns: string[], rows: string[][], widths = columns.map(() => 1)) => {
    const tableId = `${id}-table-${section.blocks.length}`;
    const total = widths.reduce((a, b) => a + b, 0);
    const limits = widths.map(w => Math.max(70, Math.min(650, Math.round(w / total * 1600))));
    rows.forEach(row => splitTableRow(row, limits).forEach(cells => section.blocks.push({ id: `${id}-${section.blocks.length}`, kind: "row", table: tableId, caption, columns, widths, cells })));
  };
  return { section, content, paragraph, table };
}
const yes = (v: boolean) => v ? "Yes" : "No";
const joined = (a: string[]) => a.length ? a.join(", ") : "None supplied";

function buildSections(p: AgrorithmReportProps): Section[] {
  const { farm: f, scenario: s, results: rs, weather, veg } = p, crops = cropRegistry(f), sections: Section[] = [];
  const weatherSummary = summarizeWeather(weather), matching = p.weatherCoordinates?.matching;
  const overview = makeSection("overview", "01 / YOUR DECISION CONTEXT", "A field conversation, with evidence.", "A transparent screening snapshot. Review constraints and individual metrics before considering any optional index.");
  overview.content(<div className="agr-metrics"><div><span>Common horizon</span><strong>36 months</strong><small>{REPORT_HORIZON.label}</small></div><div><span>Area entered</span><strong>{display(f.areaHa)} <em>ha</em></strong><small>{display(f.areaHa * 2.47105381)} acres</small></div><div><span>Screening-feasible options</span><strong>{rs.filter(r => r.status === "feasible").length} <em>/ {rs.length}</em></strong><small>Under the current inputs and assumptions</small></div><div><span>Economics</span><strong>Unresolved</strong><small>No dated yield, price and cost model</small></div></div>);
  overview.table("The choices under review", ["Sequence", "Current status", "Known constraints", "Unknown evidence", "Non-dominated"], rs.map(r => [r.name, r.status.toUpperCase(), String(r.constraints.length), String(r.unknowns.length), r.status === "feasible" ? yes(r.pareto) : "Not compared"]), [3.2, 1.5, 1.4, 1.4, 1.6]);
  overview.paragraph("How to read this report", "Observed weather and satellite evidence, entered farmer information, modeled scenarios and illustrative geometry are different kinds of evidence. Feasible means the entered scenario passes the current screening rules; it does not validate yield or suitability. Unknown evidence remains unknown. No yield, profit, nitrogen, soil-carbon or erosion improvement is guaranteed.");
  sections.push(overview.section);

  const inputs = makeSection("inputs", "02 / THE FIELD YOU ENTERED", "Start with the ground truth.", "Every field input is carried into this report, including unknown answers and stated assumptions.");
  inputs.table("Farm and practical limits", ["Input", "Entered value"], [
    ["Field name", f.name], ["Latitude / longitude (rounded display)", `${display(f.lat)}° / ${display(f.lon)}°`],
    ["Crop selected for exploration", f.cropInterest ? `${ATLAS_CROPS.find(c => c.id === f.cropInterest)?.name ?? f.cropInterest} · ${cropInterestScope(f.cropInterest)}` : "None selected"],
    ...(f.cropInterest ? [["Selected crop scope", cropInterestScope(f.cropInterest) === "annual" ? "Preference retained; existing rotation and confirmed dates remain unchanged." : "Reference preference only. This crop or orchard is not simulated by the current annual 36-month rotation engine."]] : []),
    ...(f.coordinateEvidence ? [["Coordinate provenance", "Device geolocation estimate; confirm this point is the farm rather than only the device's current location."], ["Device-reported horizontal accuracy", f.coordinateEvidence.accuracyM === null ? "Unknown; not a surveyed boundary" : `${display(f.coordinateEvidence.accuracyM, " m")} (reported estimate; not a surveyed boundary)`], ["Coordinate estimate captured", f.coordinateEvidence.capturedAt]] : []),
    ["Area", `${display(f.areaHa)} ha / ${display(f.areaHa * 2.47105381)} acres`],
    ["Irrigation method", f.irrigation], ["Delivery efficiency", f.efficiency === null ? "Unknown" : `${percent(f.efficiency)} (fraction ${display(f.efficiency)})`], ["Delivered-water limit", display(f.waterLimitMm, " mm / common horizon")],
    ["Soil texture", f.soilTexture || "Unknown"], ["Soil pH", display(f.soil.ph)], ["Soil EC", display(f.soil.ec, " dS/m")], ["Available root-zone storage capacity", display(f.soil.capacityMm, " mm")], ["Soil depth", display(f.soil.depthCm, " cm")], ["Soil test date", f.soil.date || "Unknown"], ["Soil source / status", f.soil.source || "Unknown"],
    ["Equipment access", joined(f.equipment)], ["Market access", joined(f.markets)], ["Crop exclusions", f.exclusions.length ? f.exclusions.map(c => crops[c].name).join(", ") : "None selected"], ["Budget", display(f.budget, " PKR")], ["Management-confirmation checkbox", yes(f.confirmed)], ["Crop-parameter registry", f.cropTable ? "User-imported table; source applicability remains unverified" : "Bundled provisional crop table"],
  ], [1, 2.5]);
  inputs.paragraph("Farmer observations", f.observations || "No farmer observations were entered.");
  inputs.paragraph("Optional polygon, exactly as entered", f.polygon || "No polygon was supplied. Point coordinates do not define a field boundary.");
  inputs.table("Entered existing sequence", ["Crop", "Sow", "Harvest / terminate", "Retain residue"], f.sequence.length ? f.sequence.map(a => [crops[a.crop].name, a.sow, a.harvest, yes(a.residue)]) : [["No existing sequence supplied", "Unknown", "Unknown", "Unknown"]], [2.5, 1.3, 1.5, 1.2]);
  sections.push(inputs.section);

  const settings = makeSection("settings", "03 / SETTINGS & PRIORITIES", "Change the question. Keep the evidence.", "Weather perturbations are hypothetical stress tests of historical data, not forecasts.");
  settings.table("Scenario inputs", ["Control", "Current value", "Interpretation"], [["Historical rainfall multiplier", `${s.rainFactor} (${percent(s.rainFactor)})`, "Perturbs historical daily rainfall"], ["Temperature offset", `${s.tempDelta >= 0 ? "+" : ""}${s.tempDelta} °C`, "Adds to historical daily minimum and maximum"], ["Water-budget multiplier", `${s.waterFactor} (${percent(s.waterFactor)})`, "Changes the feasibility budget; does not reduce crop ET"], ["Crop Kc multiplier", `${s.kcFactor}`, "Parameter sensitivity; not a crop-growth forecast"]], [1.5, 1.2, 2.7]);
  settings.table("Optional index weights", ["Dimension", "Weight supplied", "Normalized share"], Object.entries(s.weights).map(([key, value]) => [key, String(value), Object.values(s.weights).reduce((a, b) => a + b, 0) ? percent(value / Object.values(s.weights).reduce((a, b) => a + b, 0)) : "No index: zero total weight"]), [1.5, 1.2, 2.7]);
  if (p.uiSnapshot && Object.keys(p.uiSnapshot).length) settings.table("View, filter and interface snapshot", ["Setting", "Captured value"], Object.entries(p.uiSnapshot).map(([key, value]) => [key, display(value)]), [1, 2.5]);
  settings.paragraph("Scope of view filters", "Interface and atlas filters are recorded for traceability. They do not silently become farm measurements, crop parameters or engine constraints. Crop-climate context is a broad provisional screen; an illustrative soil filter is not a measured soil layer.");
  sections.push(settings.section);

  const comparison = makeSection("comparison", "04 / COMPONENTS BEFORE RANKING", "See the trade-offs, individually.", "Water is a requirement estimate, cover is a calendar indicator, and temperature exposure counts do not predict crop damage.");
  comparison.content(<WaterChart results={rs} />);
  comparison.table("Comparable indicators", ["Sequence", "Live crop days", "Residue-only days", "Families", "Legume", "Heat / frost days", "Evidence completeness"], rs.map(r => [r.name, percent(r.liveCover), percent(r.residueCover), String(r.families), yes(r.legume), `${display(r.heatDays)} / ${display(r.frostDays)}`, percent(r.completeness)]), [2.6, 1.4, 1.5, .8, .8, 1.5, 1.7]);
  comparison.paragraph("Keep completeness separate", "Input completeness counts supplied dimensions, including declared assumptions. It is not the percentage of inputs observed in a field or the probability of a successful crop. Missing numerical evidence is displayed as Unknown and never improves an index. Chart labels wrap within their columns; full sequence and crop names remain in the tables. Very large chart values use scientific notation; tables retain the numerical values.");
  sections.push(comparison.section);

  const evidence = makeSection("evidence", "05 / OBSERVATIONS & COVERAGE", "Know what the data can support.", "Observation dates, spatial support and missingness stay visible alongside the modeled results.");
  evidence.table("Historical weather record", ["Evidence attribute", "Recorded value"], [["Source / status", p.weatherSource], ["Available date range", weatherSummary.rows ? `${weatherSummary.first} - ${weatherSummary.last}` : "No weather supplied"], ["Daily rows / complete rows", `${weatherSummary.rows} / ${weatherSummary.complete}`], ["Weather coordinates", p.weatherCoordinates ? `${display(p.weatherCoordinates.lat)}°, ${display(p.weatherCoordinates.lon)}°` : "Not supplied to the report"], ["Coordinate alignment", matching === undefined ? "Not recorded" : matching ? "Matches the entered farm point" : "Does not match the entered farm point; engine results remain unresolved"], ["Latest observation age", weatherSummary.last ? `${Math.max(0, Math.floor((Date.parse(p.generatedAt ?? new Date().toISOString()) - Date.parse(weatherSummary.last)) / 86400000))} days at report generation` : "Unknown"]], [1, 2.6]);
  evidence.paragraph("Weather interpretation", "POWER historical Tmin/Tmax are in °C and precipitation in mm/day. The bundled cache uses UTC days and regional MERRA-2 meteorology, approximately 0.5° latitude by 0.63° longitude (rounded display). A requested point is not a field sensor or a forecast. For manually imported weather, its provider, units, date convention and spatial support must be checked independently; the source label above is retained.");
  if (weatherSummary.months.length) evidence.content(<WeatherChart months={weatherSummary.months} />);
  sections.push(evidence.section);

  const eo = makeSection("vegetation", "06 / SATELLITE CONTEXT", "A vegetation signal, with its limits.", "Observed vegetation history is distinct from a proposed rotation. Low NDVI alone cannot identify bare soil, crop identity, absent residue, nutrients or carbon.");
  if (!veg) eo.paragraph("Satellite evidence is missing", "No Earth-observation dataset was supplied to this report. No vegetation history or field condition is inferred.");
  else {
    eo.table("Earth-observation provenance", ["Evidence attribute", "Recorded value"], [["Publisher", veg.publisher], ["Product / version / DOI", `${veg.product} / ${veg.version} / ${veg.doi}`], ["Observation date range", veg.period || `${veg.observations[0]?.date ?? "Unknown"} - ${veg.observations.at(-1)?.date ?? "Unknown"}`], ["Retrieved", veg.retrieved], ["Status", veg.status || "Supplied EO record; check provenance"], ["Native support", `${veg.spatialSupport.shape.join(" × ")} pixels at ${veg.spatialSupport.pixelSizeM} m pixel spacing`], ["Native CRS / bounds", `${veg.spatialSupport.nativeCRS ?? "Not supplied"} / ${veg.spatialSupport.nativeBounds?.map(n => display(n)).join(", ") ?? "Not supplied"}`], ["Footprint coordinates (rounded display)", JSON.stringify(veg.spatialSupport.coordinates.map(r => r.map(p => p.map(n => +n.toFixed(2)))))], ["Observation counts", `${veg.observations.length} scenes; ${veg.observations.filter(o => o.ndvi !== null).length} plotted NDVI means`]], [1, 2.6]);
    eo.paragraph("Quality and processing", veg.quality); eo.paragraph("Spatial and interpretation limits", veg.note); eo.content(<VegetationChart veg={veg} />);
    eo.table("Scene-level quality ledger - granule identifiers link to exact source records", ["Acquired", "NDVI", "Valid / total", "Coverage", "Product / granule identifier"], veg.observations.map(o => [o.date, o.ndvi === null ? "Rejected / missing" : o.ndvi.toFixed(2), `${o.validPixels} / ${o.totalPixels}`, percent(o.coverage), o.item]), [1.4, 1.7, 1.2, 1.1, 4.8]);
    if (veg.failures.length) eo.table("Recorded access / processing failures", ["Item", "Reason"], veg.failures.map(v => [v.item, v.reason]), [1, 2]);
  }
  sections.push(eo.section);

  const models = makeSection("model-preview", "07 / VISUAL FIELD GUIDE", "Two views. Two different depth scales.", "Actual Blender poster renders. Geometry explains a process; observations and scenario calculations remain separate evidence.");
  models.content(<ScientificModelFigure />);
  sections.push(models.section);

  const cropImages = makeSection("crop-illustrations", "07 / VISUAL FIELD GUIDE / CROPS", "The crops in your comparison.", "Actual project illustrations accompany the selected sequences. Images do not establish growth, yield, suitability or crop condition.");
  const selectedCrops = [...new Set(rs.flatMap(r => r.sequence.map(a => a.crop)))].map(id => ({ id, crop: crops[id] }));
  for (let offset = 0; offset < selectedCrops.length; offset += 2) cropImages.content(<CropIllustrations crops={selectedCrops.slice(offset, offset + 2)} />);
  if (selectedCrops.length) sections.push(cropImages.section);

  for (const r of rs) {
    const rotation = makeSection(`rotation-${r.id}`, `08 / ROTATION DETAIL / ${r.status.toUpperCase()}`, r.name, r.description);
    for (let offset = 0; offset < r.sequence.length; offset += 8) rotation.content(<CalendarChart result={r} farm={f} offset={offset} />);
    rotation.paragraph("Calendar interpretation", "Stage bands use the current crop-stage fractions scaled to the entered sowing/harvest interval; they are not simulated phenology. All calendars share the same 36-month time scale. A minimum seven-day harvest/termination transition buffer is a screening rule. Retained residue has an explicit 45-day display assumption.");
    rotation.table("Exact crop dates and residue assumptions", ["Crop / family", "Sow", "Harvest / terminate", "Duration", "Residue"], r.sequence.map(a => [`${crops[a.crop].name} / ${crops[a.crop].family}`, a.sow, a.harvest, `${Math.round((Date.parse(a.harvest) - Date.parse(a.sow)) / 86400000)} d`, a.residue ? "Retained; 45-day assumption" : "None assumed"]), [2.4, 1.2, 1.5, .8, 2]);
    rotation.table("Root-zone screening water account", ["Water component", "Result", "Meaning"], [["Crop ET", display(r.etc, " mm"), "Evapotranspiration demand during scheduled crop days"], ["Effective rainfall", display(r.effectiveRain, " mm"), "Fixed 80% rainfall assumption"], ["Initial / final storage", `${display(r.initialStorage)} / ${display(r.finalStorage)} mm`, "Single carrying root-zone bucket"], ["Uncropped soil evaporation", display(r.soilEvaporation, " mm"), "Up to 0.25 ET0 from available storage"], ["Drainage", display(r.drainage, " mm"), "Overflow from the root-zone bucket"], ["Net irrigation", display(r.netIrrigation, " mm"), "Water required at the modeled root zone"], ["Delivered irrigation", display(r.delivered, " mm"), "Net divided by supplied delivery efficiency"], ["Delivered irrigation volume", display(r.volume, " m³"), `Same ${display(f.areaHa)} ha area; 1 mm over 1 ha = 10 m³`], ["Daily weather coverage", percent(r.coverage), "Incomplete horizon suppresses numerical totals/ranking"]], [1.4, 1.2, 2.8]);
    rotation.table("What would make this rotation viable?", ["Evidence category", "Constraint or next check"], [
      ...r.constraints.map(t => ["Known screening constraint", t]), ...r.unknowns.map(t => ["Unknown evidence / unresolved", t]), ...r.warnings.map(t => ["Management or model limitation", t]),
      ...(!r.constraints.length && !r.unknowns.length ? [["Current screening result", "Passes supplied demo rules. Confirm local soil/cultivar, water delivery, equipment, market and costs before planting."]] : []),
    ], [1, 2.8]);
    if (r.stageExposure.length) rotation.table("Historical exposure by crop stage", ["Crop", "Stage", "Crop days", "Heat days", "Frost days", "ET > effective rain days"], r.stageExposure.map(v => [v.crop, v.stage, String(v.days), String(v.heat), String(v.frost), String(v.deficit)]), [2, 1.6, 1, 1, 1, 1.7]);
    rotation.paragraph("Exposure is not damage", `Total heat / frost / rainfall-gap exposure: ${display(r.heatDays)} / ${display(r.frostDays)} / ${display(r.deficitDays)} crop days. These use provisional crop thresholds and are not yield-loss functions. ET greater than effective rainfall does not establish plant water stress where irrigation is supplied.`);
    sections.push(rotation.section);
  }

  const robust = makeSection("robustness", "09 / REPLAY & SENSITIVITY", "How stable is the comparison?", "Enumerated historical windows and parameter cases are not independent trials or calibrated probabilities.");
  robust.table("Historical replay - accepted complete windows only", ["Sequence", "Complete windows", "Delivered water values (mm)", "Range (mm)"], rs.map(r => [r.name, `${r.replay.length} / 4 attempted`, r.replay.length ? r.replay.map(v => Math.round(v).toLocaleString()).join(", ") : "Unavailable", r.replay.length ? `${Math.round(Math.min(...r.replay))} - ${Math.round(Math.max(...r.replay))}` : "Unknown"]), [2, 1.5, 3, 1.4]);
  robust.paragraph("Replay support", "The engine preserves crop order across consecutive 36-month historical windows starting July 2018, 2019, 2020 and 2021. Windows overlap and only complete windows are accepted. Values are listed in accepted-window order; the result schema does not retain the date label of an omitted partial window. Historical replay does not validate future yields.");
  const cases = sensitivity(f, matching === false ? [] : weather, s);
  robust.table("Six enumerated cases - priorities and other settings stay fixed", ["Rain factor", "Kc factor", "Sequence", "Status", "Delivered mm", "Optional index", "Pareto"], cases.flatMap(c => c.results.map(r => [c.rainFactor.toFixed(2), c.kcFactor.toFixed(2), r.name, r.status, display(r.delivered), display(r.score), r.status === "feasible" ? yes(r.pareto) : "Not compared"])), [1, 1, 2.7, 1.5, 1.4, 1.4, 1.1]);
  robust.paragraph("Sensitivity definition", "Rainfall is enumerated at the current setting minus 20 percentage points, current, and plus 20 percentage points (clipped at zero), crossed with Kc multipliers 0.9 and 1.1. The number of favorable cases is not a probability of success. Water-budget and priority effects are represented by the current scenario, not by invented future outcomes.");
  sections.push(robust.section);

  const ranking = makeSection("index", "10 / OPTIONAL INDEX", "A preference summary, after the components.", "Hard feasibility rules always apply. Priority sliders cannot override a known constraint or fill missing evidence.");
  ranking.table("Current optional index", ["Sequence", "Status", "Optional index / 100", "Non-dominated among feasible choices"], rs.map(r => [r.name, r.status, display(r.score), r.status === "feasible" ? yes(r.pareto) : "Not compared"]), [2.6, 1.5, 1.6, 2.4]);
  ranking.paragraph("Fixed normalization and weights", "Water uses max(0, 1 - delivered mm / 6000); cover uses the live-calendar fraction; diversity uses min(1, family count / 3); exposure uses max(0, 1 - (heat + frost days) / horizon days). The weighted sum is divided by the sum of supplied weights and multiplied by 100. Zero total weight gives no index. Infeasible or unresolved options are not ranked. Required missing numerical dimensions suppress the index.");
  ranking.paragraph("Pareto comparison", "Among screening-feasible choices only, minimize delivered irrigation and heat-plus-frost exposure; maximize live cover and distinct families. A choice dominates another only when no dimension is worse and at least one is better. The baseline can remain non-dominated. This report never forces an alternative to win.");
  sections.push(ranking.section);

  const parameters = makeSection("parameters", "11 / PARAMETER REGISTER", "Every crop assumption stays inspectable.", "This is the exact current registry used for screening, including imported values and provisional flags.");
  for (const [id, c] of Object.entries(crops)) {
    parameters.table(`${c.name.length > 75 ? c.name.slice(0, 72) + "..." : c.name} (${id})`, ["Parameter", "Current value"], [...(c.name.length > 75 ? [["Full crop name", c.name]] : []), ["Family / legume", `${c.family} / ${yes(c.legume)}`], ["Sowing window / duration", `${c.window.join(" to ")} / ${c.duration.map(n => display(n)).join(" to ")} days`], ["Stage fractions: initial, development, mid, late", c.stages.map(n => display(n)).join(", ")], ["Stage Kc: initial, development, mid, late", c.kc.map(n => display(n)).join(", ")], ["Heat / frost screen", `${display(c.heat)} °C daily max / ${display(c.frost)} °C daily min`], ["Illustrative root-depth parameter", `${display(c.rootM)} m; not a measured root profile`], ["Equipment / market", `${c.equipment} / ${c.market}`], ["Region / variety applicability", c.applicability || "Not supplied; local applicability remains provisional"], ["Source", c.source], ...c.provisional.map(v => ["Provisional flag", v])], [1.2, 2.8]);
  }
  sections.push(parameters.section);

  const methods = makeSection("methods", "12 / METHODS & ASSUMPTIONS", "Use the model within its limits.", "Software checks verify implementation. They do not establish agronomic validity.");
  [
    ["Reference ET", "Daily Hargreaves screening ET0 uses FAO extraterrestrial radiation from latitude/day of year and the 408/1000 radiation-to-mm conversion. It is not locally calibrated FAO Penman-Monteith. Crop ET uses stage-specific Kc and the current Kc multiplier."],
    ["Root-zone water", "A single bucket starts at 50% of supplied available storage. Fixed 80% effective rainfall enters storage; overflow drains. Crops consume ET; assumed net irrigation fills a deficit. Uncropped evaporation consumes up to 0.25 ET0. Storage carries between crops and years. Initial storage + effective rain + net irrigation = final storage + crop ET + uncropped evaporation + drainage."],
    ["Irrigation and rice", "Delivered water is net irrigation divided by delivery efficiency; volume is mm × ha × 10. Requirement is compared with a budget, assuming the water could be supplied. This is not a deficit-irrigation response or aquifer model. Paddy rice needs land preparation, standing water, seepage and percolation beyond ET; incomplete paddy terms keep the case unresolved."],
    ["Calendar and cover", "Seven-day transitions, crop duration/windows, overlap, exclusions, equipment, markets and supplied water limits are checked. Live cover is scheduled crop days, not observed canopy. Residue-only days use stated retention and a 45-day persistence assumption. Cover crops consume water and need seed, labor, cost and timely termination."],
    ["Soil and crop uncertainty", "The provisional pH 6-8.5 / EC <=4 dS/m screen is a demonstration assumption, not a calibrated crop/variety response. Soil tests need units, depth, date, method and source. Legume inclusion is not an automatic nitrogen credit. Imported crop parameters retain unverified applicability."],
    ["Visuals and satellite limits", "Soil, roots, crops and groundwater geometry are illustrative. Groundwater is water in pores/fractures at an explicitly separate demo scale, not an underground pool or a satellite-derived depth. SMAP/GRACE are not interpreted as field water-table measurements. No future soil recovery, carbon gain or yield improvement is animated or guaranteed."],
  ].forEach(([title, text]) => methods.paragraph(title, text));
  sections.push(methods.section);

  const sources = makeSection("sources", "13 / SOURCES & FOLLOW-UP", "Keep the trail back to the evidence.", "Direct references and a clear set of local checks accompany this exported snapshot.");
  sources.table("Methods and data references", ["Reference", "Direct source"], [["NASA POWER historical daily weather API", "https://power.larc.nasa.gov/docs/services/api/temporal/daily/"], ["NASA HLS products / quality documentation", "https://hls.gsfc.nasa.gov/data-products/"], ["FAO 56 crop evapotranspiration", "https://www.fao.org/4/X0490E/x0490e00.htm"], ["FAO irrigation, including paddy terms", "https://www.fao.org/4/s2022e/s2022e08.htm"], ["USGS aquifers and groundwater", "https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater"], ...[...new Set(Object.values(crops).map(c => c.source))].map(url => ["Current crop parameter source", url])], [1.2, 2.8]);
  sources.paragraph("Before a planting decision", "Obtain local soil tests; confirm cultivar and calendar, water rights and actual delivered volume, machinery, buyers and dated production costs. Review disease and rotation history, cover termination and residue management with a local agronomist. Record missing evidence rather than replacing it with a favorable assumption.");
  sources.paragraph("Export and review record", `Model version: ${p.modelVersion}. Generated: ${p.generatedAt ?? "At browser print"}. The supplied cover and crop/soil geometry are presentation assets, not measurements. Full machine-readable plan settings and result records are available through the app's existing JSON/CSV exports. Farm inputs are stored locally by default and are included in this report only because the user exports it.`);
  sections.push(sources.section);
  return sections;
}

function Table({ blocks, links }: { blocks: Extract<Block, { kind: "row" }>[]; links: Map<string, string> }) {
  const first = blocks[0], total = first.widths.reduce((a, b) => a + b, 0);
  return <table className="agr-table"><caption>{first.caption}</caption><colgroup>{first.widths.map((w, i) => <col key={i} style={{ width: `${w / total * 100}%` }} />)}</colgroup><thead><tr>{first.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{blocks.map(b => <tr key={b.id}>{b.cells.map((cell, i) => <td key={i}>{links.has(cell) ? <a href={links.get(cell)}>{cell}</a> : /^https:\/\//.test(cell) ? <a href={cell}>{cell}</a> : cell}</td>)}</tr>)}</tbody></table>;
}
function BlockGroups({ blocks, links }: { blocks: Block[]; links: Map<string, string> }) {
  const nodes: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]; if (b.kind === "content") { nodes.push(<div className="agr-block" key={b.id}>{b.node}</div>); continue; }
    const rows = [b]; while (i + 1 < blocks.length && blocks[i + 1].kind === "row" && (blocks[i + 1] as typeof b).table === b.table) rows.push(blocks[++i] as typeof b);
    nodes.push(<Table key={b.id} blocks={rows} links={links} />);
  }
  return <>{nodes}</>;
}

/** Wait for embedded report assets and pagination, then invoke native browser PDF/print. */
export async function printAgrorithmReport() {
  if (!document.querySelector(".agr-report")) throw new Error("Open the plan export page before printing the report.");
  await document.fonts.ready;
  await Promise.all([...document.querySelectorAll<HTMLImageElement>(".agr-report img")].map(i => i.decode().catch(() => undefined)));
  window.dispatchEvent(new Event("agrorithm-report-remeasure"));
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  window.print();
}

export default function AgrorithmReport(props: AgrorithmReportProps) {
  const [generatedAt, setGeneratedAt] = useState(props.generatedAt ?? new Date().toISOString());
  const p = useMemo(() => ({ ...props, generatedAt: props.generatedAt ?? generatedAt }), [props, generatedAt]);
  const snapshotKey = JSON.stringify(p.uiSnapshot ?? {});
  const sections = useMemo(() => buildSections(p), [p.farm, p.scenario, p.results, p.weatherSource, p.weather, p.veg, p.modelVersion, p.weatherCoordinates?.lat, p.weatherCoordinates?.lon, p.weatherCoordinates?.matching, p.generatedAt, snapshotKey]);
  const measure = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][][]>([]), [revision, setRevision] = useState(0);
  const [oversized, setOversized] = useState<string[]>([]);
  const links = useMemo(() => new Map(p.veg?.observations.map(o => [o.item, o.source]) ?? []), [p.veg]);
  useEffect(() => { const update = () => { setGeneratedAt(new Date().toISOString()); setRevision(v => v + 1); }; document.fonts.ready.then(update); addEventListener("agrorithm-report-remeasure", update); addEventListener("beforeprint", update); return () => { removeEventListener("agrorithm-report-remeasure", update); removeEventListener("beforeprint", update); }; }, []);
  useLayoutEffect(() => {
    // The print stylesheet removes the offscreen measuring tree. Preserve its
    // screen measurements when Chromium enters print media instead of reading zeros.
    if (!measure.current || matchMedia("print").matches) return;
    const failures: string[] = [];
    const next = sections.map(section => {
      const items: MeasuredItem[] = section.blocks.map(block => {
        const node = measure.current!.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`)!;
        const height = block.kind === "row" ? node.querySelector("tbody")!.getBoundingClientRect().height : node.getBoundingClientRect().height;
        const headerHeight = block.kind === "row" ? node.querySelector("caption")!.getBoundingClientRect().height + node.querySelector("thead")!.getBoundingClientRect().height : 0;
        if (height + headerHeight > REPORT_BODY_HEIGHT) failures.push(block.id);
        return { height, headerHeight, table: block.kind === "row" ? block.table : undefined };
      });
      return packMeasured(items, REPORT_BODY_HEIGHT - 8);
    });
    setPages(next); setOversized(failures);
  }, [sections, revision]);
  const count = 1 + pages.reduce((sum, section) => sum + section.length, 0); let pageNo = 1;
  return createPortal(<div className={`agr-report ${p.preview ? "agr-report-preview" : ""}`} dir="ltr" lang="en" data-report-ready={pages.length === sections.length} data-oversized-blocks={oversized.join(",")}>
    <style>{"@media print { @page { size:20in 11.25in !important; margin:0 !important; } @page agrorithmreport { size:20in 11.25in !important; margin:0 !important; } .agr-report { page:agrorithmreport; } }"}</style>
    <div className="agr-report-measure" ref={measure} aria-hidden="true">{sections.flatMap(s => s.blocks.map(b => <div className="agr-measure-block" key={b.id} data-block-id={b.id}>{b.kind === "row" ? <Table blocks={[b]} links={links} /> : b.node}</div>))}</div>
    <section className="agr-report-page agr-report-cover" data-report-page="1" aria-label="Agrorithm report cover"><img src={asset("images/report-cover.png")} alt="Agrorithm and NASA Space Apps Challenge report cover supplied by the project team" /></section>
    {sections.flatMap((section, sectionIndex) => (pages[sectionIndex] ?? []).map((indices, continuation) => { pageNo++; const number = pageNo; return <section className="agr-report-page" data-report-page={number} key={`${section.id}-${continuation}`}>
      <header className="agr-page-header"><div><span className="agr-kicker">{section.kicker}{continuation ? " / CONTINUED" : ""}</span><h1>{section.title}</h1><p>{section.subtitle}</p></div><span className="agr-wordmark">{p.brandName ?? BRAND.name}</span></header>
      <div className="agr-page-body"><BlockGroups blocks={indices.map(i => section.blocks[i])} links={links} /></div>
      <footer className="agr-page-footer"><span className="agr-footer-field">{p.farm.name}</span><span>{p.modelVersion} · {new Date(p.generatedAt!).toISOString().slice(0, 10)} · Screening, not a planting recommendation</span><strong>{String(number).padStart(2, "0")} / {String(count).padStart(2, "0")}</strong></footer>
    </section>; }))}
  </div>, document.body);
}
