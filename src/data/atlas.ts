export const ZONES = [
  ["Ocean", "No classification"],
  ["Af", "Tropical rainforest"],
  ["Am", "Tropical monsoon"],
  ["Aw", "Tropical savannah"],
  ["BWh", "Hot desert"],
  ["BWk", "Cold desert"],
  ["BSh", "Hot steppe"],
  ["BSk", "Cold steppe"],
  ["Csa", "Temperate · hot dry summer"],
  ["Csb", "Temperate · warm dry summer"],
  ["Csc", "Temperate · cold dry summer"],
  ["Cwa", "Temperate · hot summer, dry winter"],
  ["Cwb", "Temperate · warm summer, dry winter"],
  ["Cwc", "Temperate · cold summer, dry winter"],
  ["Cfa", "Temperate · hot summer, no dry season"],
  ["Cfb", "Temperate · warm summer, no dry season"],
  ["Cfc", "Temperate · cold summer, no dry season"],
  ["Dsa", "Continental · hot dry summer"],
  ["Dsb", "Continental · warm dry summer"],
  ["Dsc", "Continental · cold dry summer"],
  ["Dsd", "Continental · very cold winter"],
  ["Dwa", "Continental · hot summer, dry winter"],
  ["Dwb", "Continental · warm summer, dry winter"],
  ["Dwc", "Continental · cold summer, dry winter"],
  ["Dwd", "Continental · very cold winter"],
  ["Dfa", "Continental · hot summer, no dry season"],
  ["Dfb", "Continental · warm summer, no dry season"],
  ["Dfc", "Continental · cold summer, no dry season"],
  ["Dfd", "Continental · very cold winter"],
  ["ET", "Tundra"],
  ["EF", "Ice cap"],
];
export type AtlasCropId =
  | "wheat"
  | "maize"
  | "mung"
  | "chickpea"
  | "tomato"
  | "potato"
  | "citrus"
  | "mango";
export type SoilType = "unknown" | "sand" | "loam" | "clay" | "waterlogged";
export type CropGroup = "grains" | "pulses" | "vegetables" | "fruit";
export type AtlasCrop = {
  id: AtlasCropId;
  name: string;
  latin: string;
  symbol: string;
  climate: string;
  soil: string;
  water: string;
  source: string;
  strong: number[];
  conditional: number[];
};
export const ATLAS_CROPS: AtlasCrop[] = [
  {
    id: "wheat",
    name: "Wheat",
    latin: "Triticum spp.",
    symbol: "wheat",
    climate:
      "A cool growing season, then a drier harvest; winter/spring variety matters.",
    soil: "Deep, drained loam is a useful starting point. Drainage, pH and salinity still need local tests.",
    water: "Dry climates require enough seasonal rain or verified irrigation.",
    source:
      "https://www.arso-oran.org/wp-content/uploads/2022/10/GAPM-20-2018-Good-Agricultural-Practices-Outreach-Information-for-African-Standards-on-Wheat.pdf",
    strong: [8, 9, 11, 12, 14, 15, 17, 18, 21, 22, 25, 26],
    conditional: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    id: "maize",
    name: "Maize",
    latin: "Zea mays",
    symbol: "maize",
    climate:
      "A sufficiently long warm, frost-free growing season; maturity class matters.",
    soil: "Well-aerated, drained root zone. Waterlogging and limited storage on sand need attention.",
    water: "Water availability at flowering needs a seasonal check.",
    source:
      "https://inspection.canada.ca/en/plant-health/plant-varieties/novel-traits/applicants/directive-94-08/biology-documents/zea-mays-maize",
    strong: [1, 2, 3, 8, 11, 14],
    conditional: [4, 5, 6, 7, 9, 12, 15, 17, 18, 21, 22, 25, 26],
  },
  {
    id: "mung",
    name: "Mungbean",
    latin: "Vigna radiata",
    symbol: "pulse",
    climate:
      "Warm-season pulse; this atlas extrapolates beyond the documented Pakistan calendar and is provisional.",
    soil: "A drained seedbed. Waterlogging, salinity and cultivar suitability need confirmation.",
    water: "A short duration does not remove irrigation or termination needs.",
    source:
      "https://worldveg.tind.io/record/66217/files/English_mungbean%20production%20manual.pdf",
    strong: [],
    conditional: [1, 2, 3, 4, 6, 7, 8, 11, 14, 17, 21, 25],
  },
  {
    id: "chickpea",
    name: "Chickpea",
    latin: "Cicer arietinum",
    symbol: "pulse",
    climate:
      "Cool, relatively dry growing seasons; rainfall at flowering and maturation can increase disease risk. Global climate mapping is provisional.",
    soil: "Deep, well-drained loams or clay loams. Poor aeration, waterlogging and salinity need local checks.",
    water:
      "Stored soil moisture can contribute; irrigation depends on season and soil. Drought tolerance does not remove flowering and pod-filling water needs.",
    source: "https://oar.icrisat.org/10276/1/ChickpeaManual_full.pdf",
    strong: [],
    conditional: [4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 17, 18, 21, 22, 25, 26],
  },
  {
    id: "tomato",
    name: "Tomato",
    latin: "Solanum lycopersicum",
    symbol: "vegetable",
    climate:
      "Warm, frost-free growing season. Global mapping is a provisional seasonal screen; protected cultivation is not modeled.",
    soil: "Well-drained root zone, local pH and soil test required. Disease and rotation history matter.",
    water:
      "Steady root-zone moisture is needed. Local crop ET, effective rain and irrigation efficiency must be checked.",
    source: "https://extension.umn.edu/vegetables/growing-tomatoes",
    strong: [],
    conditional: [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 14, 15, 17, 21, 25],
  },
  {
    id: "potato",
    name: "Potato",
    latin: "Solanum tuberosum",
    symbol: "vegetable",
    climate:
      "Local variety, season and soil temperature are essential. This global climate-family screen is provisional.",
    soil: "Drained, workable soil with verified pH. Disease-free seed tubers and disease history are practical requirements.",
    water:
      "Root-zone moisture needs attention during tuber development. No universal delivered-irrigation total is assumed.",
    source: "https://extension.umn.edu/vegetables/growing-potatoes",
    strong: [],
    conditional: [6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 21, 22, 25, 26],
  },
  {
    id: "citrus",
    name: "Citrus",
    latin: "Citrus spp.",
    symbol: "fruit",
    climate:
      "Warm tropical/subtropical settings; freezing risk and rootstock/cultivar choice are essential. Perennial orchard reference only.",
    soil: "Well-drained soil with locally appropriate rootstock. A soil survey is needed before orchard establishment.",
    water:
      "Multi-year tree age, canopy, climate and irrigation management determine demand. Not part of the annual rotation engine.",
    source: "https://ipm.ucanr.edu/home-and-landscape/citrus-site-selection/",
    strong: [],
    conditional: [1, 2, 3, 4, 6, 8, 9, 11, 14],
  },
  {
    id: "mango",
    name: "Mango",
    latin: "Mangifera indica",
    symbol: "fruit",
    climate:
      "Tropical/subtropical lowlands; flowers and young fruit can be cold sensitive. Perennial orchard reference only.",
    soil: "Adapted to multiple soil textures where well drained. Local depth, flooding risk and cultivar need assessment.",
    water:
      "Demand depends on tree age, canopy and phenology. No orchard water model or annual rotation result is supplied.",
    source:
      "https://gardeningsolutions.ifas.ufl.edu/plants/edibles/fruits/mango/",
    strong: [],
    conditional: [1, 2, 3, 4, 6, 8, 11, 14],
  },
];
export function broadFit(
  crop: AtlasCropId,
  zone: number,
  soil: SoilType,
  irrigated: boolean,
) {
  const c = ATLAS_CROPS.find((c) => c.id === crop)!;
  if (zone === 0 || zone > 30)
    return {
      level: 0,
      label: "No land classification",
      reason: "Choose a classified land pixel.",
    };
  if (soil === "waterlogged")
    return {
      level: 1,
      label: "Drainage constraint",
      reason:
        "Persistent waterlogging is a management constraint for this broad crop screen.",
    };
  if ([4, 5].includes(zone) && !irrigated)
    return {
      level: 1,
      label: "Water supply unresolved",
      reason: "A desert climate is not evidence of adequate crop water supply.",
    };
  if (c.strong.includes(zone))
    return {
      level: 3,
      label: "Promising broad climate fit",
      reason:
        soil === "unknown"
          ? "Climate family fits this general adaptation. Soil, season and water are still unknown."
          : "Broad adaptation fits; selected soil is a scenario, not a mapped soil observation.",
    };
  if (c.conditional.includes(zone))
    return {
      level: 2,
      label: "Season / water check",
      reason:
        "Local growing-season temperatures, variety, water and soil may allow this crop; the climate class alone is insufficient.",
    };
  return {
    level: 1,
    label: "Outside broad preference",
    reason:
      "Cold/seasonal conditions or this coarse rule need more evidence. This is not proof of field infeasibility.",
  };
}
export const FIT_COLORS = ["#e8efec", "#d8c9ac", "#a9b99a", "#426f53"];
export function zoneAt(
  values: number[],
  width: number,
  height: number,
  lat: number,
  lon: number,
) {
  const col = Math.max(
    0,
    Math.min(width - 1, Math.floor(((lon + 180) / 360) * width)),
  );
  const row = Math.max(
    0,
    Math.min(height - 1, Math.floor(((90 - lat) / 180) * height)),
  );
  return values[row * width + col] ?? 0;
}
