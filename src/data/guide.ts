export const GUIDE = [
  {
    id: "start",
    title: "How do I start a plan?",
    tags: "begin navigation setup farm location",
    answer:
      "Choose Start planning, enter what you know, then follow the six steps. Unknown answers are allowed. Try a sample farm opens the complete Punjab example immediately. Your inputs stay on this device unless you export them.",
    route: "/studio/setup",
    action: "Open field setup",
    source: "/sources",
  },
  {
    id: "map",
    title: "How do I find a place on the satellite map?",
    tags: "search location coordinates world atlas zones soil crop suitable",
    answer:
      "Open the crop atlas and search for a town or enter latitude, longitude. Cached places and coordinates work offline. The satellite background is a NASA Blue Marble composite from August 2004; the colored layer is a historical climate classification or a provisional crop screen. It is not current field imagery or a measured soil map.",
    route: "/atlas",
    action: "Search the map",
    source: "/sources",
  },
  {
    id: "water",
    title: "What do the water numbers mean?",
    tags: "irrigation water budget ET evapotranspiration rain mm cubic volume",
    answer:
      "Crop ET describes estimated evapotranspiration. Effective rainfall is the part of rain used by the screening model. Net irrigation also accounts for the stated root-zone storage assumptions. Delivered irrigation divides net irrigation by application efficiency. One millimetre over one hectare is 10 cubic metres. These are screening estimates, not metered water use.",
    route: "/studio/scenarios",
    action: "Test water limits",
    source: "https://www.fao.org/4/X0490E/x0490e0a.htm",
  },
  {
    id: "rice",
    title: "Why is paddy rice limited in the rotation engine?",
    tags: "paddy rice baseline seepage ponding water",
    answer:
      "The atlas includes paddy rice as a crop reference. The planning engine does not estimate total paddy irrigation because it lacks locally supported preparation, standing-water, seepage and percolation parameters. ET alone cannot provide total rice irrigation. The sample baseline is explicitly assumed maize–wheat, not confirmed rice–wheat.",
    route: "/atlas",
    action: "Explore crop references",
    source: "https://www.fao.org/4/s2022e/s2022e08.htm",
  },
  {
    id: "weather",
    title: "Is this a weather forecast?",
    tags: "NASA POWER heat frost climate temperature rainfall future forecast data",
    answer:
      "No. The sample uses genuine NASA POWER historical daily weather from 2018–2024 at the pilot point. It represents a coarse weather product, not a field instrument. Rainfall and temperature sliders create hypothetical stress tests. Replaying historical seasons does not validate future yields.",
    route: "/studio/evidence",
    action: "Inspect evidence",
    source: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
  },
  {
    id: "ndvi",
    title: "Does low NDVI mean bare or unhealthy soil?",
    tags: "satellite HLS NDVI vegetation residue carbon nutrients",
    answer:
      "Low NDVI may indicate little live vegetation. It cannot establish bare soil, residue absence, crop identity, nutrient levels or soil carbon by itself. Cloud screening and valid-pixel coverage matter. Confirm surface cover and residue with the farmer before interpreting the signal.",
    route: "/studio/evidence",
    action: "View satellite observations",
    source: "https://hls.gsfc.nasa.gov/data-products/",
  },
  {
    id: "soil",
    title: "Are the soil layers and groundwater depth measured?",
    tags: "3D roots groundwater water table SMAP GRACE model illustration",
    answer:
      "The 3D layers, root shapes and planting density are illustrative. The root-zone and deeper groundwater views use different labeled scales. Groundwater occupies pores and fractures. The depth slider is user-controlled; it is not a SMAP or GRACE field measurement. The decision engine does not simulate aquifer dynamics.",
    route: "/soil",
    action: "Explore the cutaway",
    source:
      "https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater",
  },
  {
    id: "choices",
    title: "Why is a rotation infeasible or unresolved?",
    tags: "alternative viable constraints hard missing unknown equipment market dates buffers",
    answer:
      "Crop windows, duration, overlap, transition buffers, soil restrictions, water, equipment, exclusions and markets are checked before priorities. A known failed constraint is infeasible. Missing necessary evidence is unresolved. Priority weights cannot override hard constraints. The trade-off view explains what could make each option viable.",
    route: "/studio/tradeoffs",
    action: "Inspect trade-offs",
    source: "/sources",
  },
  {
    id: "rank",
    title: "Does the highest score guarantee the best harvest?",
    tags: "ranking weights score pareto profit yield sensitivity legume carbon",
    answer:
      "No. Compare the individual metrics and non-dominated choices first. Scores use stated fixed normalization and your weights; missing evidence is kept separate. No guaranteed yield, profit, carbon gain or fertilizer replacement is claimed. Sensitivity frequencies describe the enumerated scenarios, not calibrated probabilities of success.",
    route: "/studio/tradeoffs",
    action: "Compare components",
    source: "/sources",
  },
  {
    id: "offline",
    title: "Can I use this offline or on a slower phone?",
    tags: "mobile slow performance quality WebGL offline save export privacy",
    answer:
      "After the app and sample have been loaded, the cached sample can work offline. Choose Static in graphics quality for posters and the complete planning workflow without WebGL. Low quality limits pixel density. Models load when needed. Save locally to resume, or export JSON/CSV and use browser print for a PDF.",
    route: "/studio/export",
    action: "Open exports",
    source: "/sources",
  },
];
export const DESTINATIONS = [
  {
    title: "Home",
    detail: "Start, sample and visual introduction",
    route: "/",
    tags: "menu",
  },
  {
    title: "Field setup",
    detail: "Location, crops, soil and practical limits",
    route: "/studio/setup",
    tags: "plan equipment budget irrigation",
  },
  {
    title: "Evidence",
    detail: "NASA weather and satellite observations",
    route: "/studio/evidence",
    tags: "HLS POWER NDVI rain temperature data",
  },
  {
    title: "Rotation lab",
    detail: "Compare the baseline and alternatives",
    route: "/studio/lab",
    tags: "crops calendar wheat maize mungbean",
  },
  {
    title: "What if?",
    detail: "Water, weather and priority controls",
    route: "/studio/scenarios",
    tags: "scenario stress test",
  },
  {
    title: "Trade-offs",
    detail: "Feasibility, metrics and sensitivity",
    route: "/studio/tradeoffs",
    tags: "ranking constraints viable",
  },
  {
    title: "Save & export",
    detail: "JSON, CSV, print and local save",
    route: "/studio/export",
    tags: "PDF download resume",
  },
  {
    title: "Satellite crop atlas",
    detail: "Search places, climate zones and crop fit",
    route: "/atlas",
    tags: "world map soil wheat maize corn rice mung sorghum",
  },
  {
    title: "3D soil explorer",
    detail: "Crop models, roots and groundwater",
    route: "/soil",
    tags: "plants water table layers model",
  },
  {
    title: "3D crop library",
    detail: "Four models: grains, pulses, vegetables and fruit trees",
    route: "/crops",
    tags: "plants corn wheat maize mungbean chickpea tomato potato citrus mango models preview",
  },
  {
    title: "Question helper",
    detail: "Search source-linked explanations",
    route: "/help",
    tags: "answers help guide",
  },
  {
    title: "Learned weather patterns",
    detail: "Explore a model trained on historical NASA POWER data",
    route: "/weather-patterns",
    tags: "AI machine learning trained NASA weather clusters historical model holdout",
  },
  {
    title: "Sources & methods",
    detail: "Data provenance and scientific limits",
    route: "/sources",
    tags: "how works documentation",
  },
  {
    title: "About jt_1",
    detail: "Meet the project team",
    route: "/about",
    tags: "members",
  },
];
export function searchText(query: string, text: string) {
  const normalized = query
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
  if (!normalized) return true;
  const stop = new Set([
    "how",
    "what",
    "which",
    "is",
    "a",
    "the",
    "do",
    "does",
    "i",
    "my",
    "can",
    "for",
    "need",
    "much",
    "to",
    "of",
    "in",
    "when",
    "are",
    "should",
    "it",
    "use",
    "and",
  ]);
  const words = normalized.split(/\s+/);
  const relevant = words.filter((t) => !stop.has(t));
  const terms = (relevant.length ? relevant : words).map((t) =>
    t === "corn" ? "maize" : t,
  );
  return terms.some((t) => text.toLocaleLowerCase().includes(t));
}
