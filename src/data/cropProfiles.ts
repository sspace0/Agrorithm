export interface CropProfile {
  temperature: string;
  planting: string;
  harvest: string;
  water: string;
  ph: string;
  drought: string;
  heat: string;
  applicability: string;
  sources: { title: string; url: string }[];
  provisional: string[];
}

// Display references reviewed 2026-11-14. Bracketed numbers refer to each profile's
// source list. General crop traits are not field measurements or engine limits.
const faoWater = {
  title: "FAO Irrigation Water Management: Crop water needs, Table 14",
  url: "https://www.fao.org/4/s2022e/s2022e07.htm",
};
const punjabCalendar = {
  title:
    "Punjab Agriculture: Manual of Maize Cultivation with HEIS, crop calendar",
  url: "https://agripunjab.gov.pk/system/files/Maize-Cultivation-with-HEIS.pdf",
};
const horticultureCalendar = {
  title:
    "State Bank of Pakistan: Horticulture financing, Appendix A calendar (archival)",
  url: "https://www.sbp.org.pk/guidelines/Horticulture/Horticulture_Guideline.pdf",
};

export const PROFILES: Record<string, CropProfile> = {
  wheat: {
    temperature:
      "General reference [1]: 15–20 °C mean daily temperature supports growth and development. This is not a temperature range for every growth stage.",
    planting:
      "Punjab calendar example [2]: November sowing for the cool Rabi season; confirm the district and cultivar window.",
    harvest:
      "Punjab calendar example [2]: April. Actual maturity follows sowing date, cultivar and weather.",
    water:
      "Indicative crop ET [3]: 450–650 mm over the growing period. This is water consumed through evapotranspiration, not delivered irrigation.",
    ph: "General reference [4]: best growth around pH 5.5–7.5; this is a reference range, not an automatic soil exclusion.",
    drought:
      "Qualitative reference [3]: low–medium sensitivity to drought. This does not imply that critical growth stages can go without water.",
    heat: "General reference [1]: temperatures around 30–35 °C can impair performance. Stage, duration and cultivar affect the response; no yield-loss percentage is assigned.",
    applicability:
      "Pakistan/Punjab calendar example; Bangladesh government climate reference and general FAO soil/water guidance. Locally recommended bread-wheat cultivars need separate checks.",
    sources: [
      {
        title: "Bangladesh Department of Agricultural Extension, BAMIS: Wheat",
        url: "https://www.bamis.gov.bd/en/crops/view/9/",
      },
      punjabCalendar,
      faoWater,
      {
        title: "FAO: Environmental factors and wheat soil pH",
        url: "https://www.fao.org/4/x8234e/x8234e08.htm",
      },
    ],
    provisional: [
      "A calendar example is not a field-specific recommendation.",
      "General temperature, pH and drought descriptions have not been calibrated to the pilot cultivar.",
      "Irrigation also depends on effective rainfall, stored soil water and application efficiency.",
    ],
  },
  maize: {
    temperature:
      "General reference [1]: 20–30 °C for photosynthesis and growth. Germination and reproductive stages have different requirements.",
    planting:
      "Punjab calendar examples [2]: February for spring maize and July for the summer/autumn crop; hybrid and district can shift dates.",
    harvest:
      "Punjab calendar examples [2]: May and November respectively. Use actual entered harvest dates for a plan.",
    water:
      "Indicative crop ET [3]: 500–800 mm over the growing period. Delivered irrigation is a separate quantity.",
    ph: "General reference [4]: FAO's optimal-soil-pH chart gives about 5.5–7.0. The chart is not a locally calibrated feasibility threshold.",
    drought:
      "Qualitative reference [3]: medium–high sensitivity to drought; water shortage can constrain this crop.",
    heat: "General reference [1]: 35–40 °C may cause heat stress, especially during reproduction. This is not a guaranteed damage threshold for a particular hybrid.",
    applicability:
      "Punjab spring/autumn calendar examples combined with a global FAO/IIASA maize profile. Grain, silage and sweet-corn cultivars should not share an assumed duration.",
    sources: [
      {
        title: "FAO/IIASA GAEZ v4: Maize crop profile",
        url: "https://s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/crop_profiles/GAEZ_Crop_profile_maize.pdf",
      },
      punjabCalendar,
      faoWater,
      {
        title:
          "FAO Plant nutrition for food security: Figure 18, optimal soil pH",
        url: "https://www.fao.org/4/a0443e/a0443e02.pdf",
      },
    ],
    provisional: [
      "Global temperature and soil references are not hybrid-specific Punjab limits.",
      "Seasonal ET is not an irrigation allocation or an applied-water estimate.",
      "The map's climate zones cannot establish local soil suitability.",
    ],
  },
  mung: {
    temperature:
      "General Australian reference [1]: optimum growth around 28–30 °C. This is not a verified optimum for every Pakistani mungbean variety.",
    planting:
      "Pakistan regional guidance [2]: northern Punjab, late March–mid April or late June–mid July; central Punjab, March or mid May–mid June; southern Punjab, late February–mid March or mid May–mid June.",
    harvest:
      "Observed regional study [3]: southern Punjab harvest around August; Pothwar harvest late September–early October. These observations are not a universal maturity calendar.",
    water:
      "Unknown seasonal ET for the pilot. Reference [4] stresses adequate moisture from flowering through late pod filling. A generic FAO bean value is not substituted for mungbean.",
    ph: "General US reference [4]: best performance at pH 6.2–7.2; alkaline soils may induce iron chlorosis. Local variety and soil-test interpretation remain unresolved.",
    drought:
      "Qualitative reference [4]: moisture shortage around flowering/pod filling is a concern; short crop duration does not establish drought immunity.",
    heat: "General Australian reference [1]: avoid extreme heat during flowering; the cited maximum temperature is 40 °C. Do not treat it as a calibrated Punjab injury threshold.",
    applicability:
      "Pakistan planting windows are zone-specific. Temperature guidance is Australian, and the pH/moisture reference is US extension; transfer to the selected Punjab cultivar is provisional.",
    sources: [
      {
        title:
          "NSW Department of Primary Industries: Summer cropping options 2022/23, mungbean",
        url: "https://www.dpi.nsw.gov.au/__data/assets/pdf_file/0003/1415388/summer-crop-options-2022.pdf",
      },
      {
        title:
          "University of Agriculture Faisalabad / World Vegetable Center: Mungbean production manual",
        url: "https://worldveg.tind.io/record/66217/files/English_mungbean%20production%20manual.pdf",
      },
      {
        title:
          "Primary regional study: Mungbean as a catch crop in Pakistan and Uzbekistan (2018)",
        url: "https://doi.org/10.1080/23311932.2018.1499241",
      },
      {
        title:
          "University of Wisconsin / Minnesota Alternative Field Crops Manual: Mungbean",
        url: "https://corn.aae.wisc.edu/Crops/Mungbean.aspx",
      },
    ],
    provisional: [
      "Confirm the selected zone and current locally recommended variety; the Pakistan manual lists older releases.",
      "A verified local seasonal ET or irrigation-volume requirement is missing.",
      "The WorldVeg PDF is indexed but its download returned an access error during review.",
    ],
  },
  chickpea: {
    temperature:
      "General reference [1]: a cool-season pulse. A single optimum growth range is not established here; reproductive sensitivity must be considered separately.",
    planting:
      "ICRISAT South Asian reference [1]: October–November in the post-rainy Rabi season. A current district-specific Punjab window still needs confirmation.",
    harvest:
      "Maturity reference [1]: harvest when plants are dry, pods yellow and seeds hard. Pilot harvest months are unresolved; do not infer a date from the category model.",
    water:
      "Unknown local seasonal ET/irrigation volume. ICRISAT [1] describes conserved-moisture/rainfed production and possible supplemental irrigation at branching and pod filling.",
    ph: "General reference [1]: deep loams or silty clay loams at pH 6.0–8.0 are best suited; poor aeration, salinity and high water tables need separate checks.",
    drought:
      "Qualitative reference [1]: deep roots can access stored moisture, but terminal drought can still limit pod filling. Rainfed does not mean no water requirement.",
    heat: "General reference [1]: reproductive stress is reported above 35 °C daily maximum and below 15 °C daily mean. These are different statistics, not an optimum range.",
    applicability:
      "ICRISAT's 2010 South Asian seed-production manual, mainly Indian production guidance. Desi/kabuli type, soil storage, disease history and Punjab timing require local review.",
    sources: [
      {
        title:
          "ICRISAT: Chickpea Seed Production Manual (2010), climate/soil/water/harvest",
        url: "https://oar.icrisat.org/10276/1/ChickpeaManual_full.pdf",
      },
    ],
    provisional: [
      "No verified pilot-specific harvest window or seasonal water volume is supplied.",
      "The reference manual's two supplemental irrigations are not a fixed schedule or water depth for this farm.",
      "No automatic nitrogen or fertilizer replacement is credited.",
    ],
  },
  tomato: {
    temperature:
      "General US extension reference [1]: best daytime growth around 24–29 °C (75–85 °F). Tomato night temperatures and fruit-set responses need separate consideration.",
    planting:
      "Punjab research example [2]: September early production using highly resistant indeterminate hybrids. This is one managed crop, not the province's only planting season.",
    harvest:
      "Punjab research example [2]: January–early June production from that September crop. Confirm protected/open-field management and cultivar.",
    water:
      "Indicative crop ET [3]: 400–800 mm over the growing period. It is not delivered irrigation or a fixed weekly schedule.",
    ph: "General US extension reference [4]: ideal soil pH 5.5–7.0; obtain a local soil test rather than assuming the map measures pH.",
    drought:
      "Qualitative reference [3]: medium–high drought sensitivity. Consistent soil moisture is important for fruit quality [4].",
    heat: "General US extension reference [1]: temperatures above about 35 °C (95 °F) may cause flower-bud drop and pollen injury. Cultivar, stage and exposure matter.",
    applicability:
      "Punjab's early tomato research example is restricted to specified hybrid/management conditions. US growth/pH guidance and global FAO ET require local interpretation.",
    sources: [
      {
        title:
          "Utah State University Extension: Tomato, pepper and eggplant planting",
        url: "https://extension.usu.edu/vegetableguide/tomato-pepper-eggplant/planting-spacing",
      },
      {
        title:
          "Punjab Vegetable Research Institute: Early tomato production achievements",
        url: "https://agripunjab.gov.pk/vri-achievements",
      },
      faoWater,
      {
        title: "University of Minnesota Extension: Growing tomatoes",
        url: "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-tomatoes",
      },
    ],
    provisional: [
      "The Punjab source describes a specific early-production system, not a universal crop calendar.",
      "Tomato shares Solanaceae with potato; a category illustration is not evidence of sequence compatibility.",
      "Local economics, disease resistance and irrigation delivery are not verified.",
    ],
  },
  potato: {
    temperature:
      "General FAO reference [1]: best yields at mean daily temperatures around 18–20 °C. Tuber development has a different thermal response from shoots.",
    planting:
      "Archival Pakistan calendar [2]: August–October, including Okara among the listed production areas. Confirm the current Punjab autumn window locally.",
    harvest:
      "Local months unresolved. General maturity guidance [3]: harvest mature tubers after foliage has dried; early potatoes have a different harvest stage.",
    water:
      "Indicative crop ET [4]: 500–700 mm over the growing period. This is not an applied irrigation volume.",
    ph: "General US extension reference [3]: ideal pH 6.0–6.5, with tolerance to about pH 5.0. Soil type and disease management affect local targets.",
    drought:
      "Qualitative reference [4]: high sensitivity to drought; uneven moisture can damage tuber quality [3].",
    heat: "General FAO reference [1]: tuber growth is strongly restricted above 30 °C; this is not a cultivar-specific yield-loss function.",
    applicability:
      "The Pakistan calendar is archival and covers multiple regions; physiological guidance is FAO and Minnesota extension. Seed tuber health, cultivar and Punjab autumn conditions need review.",
    sources: [
      {
        title:
          "FAO International Year of the Potato: Potato cultivation and climate",
        url: "https://www.fao.org/4/i0500e/i0500e.pdf",
      },
      horticultureCalendar,
      {
        title:
          "University of Minnesota Extension: Growing potatoes (reviewed 2026)",
        url: "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-potatoes",
      },
      faoWater,
    ],
    provisional: [
      "A current district/cultivar-specific planting and harvest calendar is missing.",
      "Different references give different pH targets; this display does not impose a soil constraint.",
      "Weekly garden watering guidance is not converted into Punjab seasonal irrigation demand.",
    ],
  },
  citrus: {
    temperature:
      "General reference [1]: tropical/subtropical conditions. No single optimum temperature range is assigned across oranges, mandarins, lemons and their rootstocks.",
    planting:
      "Archival Pakistan orchard calendar [2]: February–March or August–September establishment. This is tree planting, not an annual rotation sowing window.",
    harvest:
      "Archival Pakistan reference [2]: sweet oranges December–February; Kinnow mandarins November–April. Variety and maturity standards determine the actual window.",
    water:
      "Unknown local annual orchard ET and irrigation volume. FAO [3] differentiates mature canopy/ground-cover conditions; tree age and orchard management must be supplied.",
    ph: "General Texas extension reference [4]: most citrus grows well at pH 6–8. Rootstock, salinity and drainage can change suitability; this is not a Punjab threshold.",
    drought:
      "Unknown for the selected scion/rootstock. General reference [4] requires well-drained root conditions; drought tolerance cannot be inferred from an evergreen canopy.",
    heat: "Unknown universal heat-injury threshold. Reference [1] explains temperature-dependent ripening and variety differences; a warm-climate label does not mean immunity to heat stress.",
    applicability:
      "Pakistan calendar distinguishes sweet orange from Kinnow. Site/soil references describe California and Texas. Orchard suitability also needs scion, rootstock, salinity, drainage and multi-year establishment evidence.",
    sources: [
      {
        title: "University of California IPM: Citrus site selection",
        url: "https://ipm.ucanr.edu/home-and-landscape/citrus-site-selection/",
      },
      horticultureCalendar,
      faoWater,
      {
        title:
          "Texas A&M AgriLife Extension: Citrus climate, soils and rootstocks",
        url: "https://aggie-horticulture.tamu.edu/fruit-nut/fact%20sheets/citrus/",
      },
    ],
    provisional: [
      "This perennial reference is excluded from the annual rotation engine.",
      "Calendar source is archival; obtain current local orchard advice.",
      "No field water-table depth, universal heat threshold or orchard water allocation is inferred.",
    ],
  },
  mango: {
    temperature:
      "General Indian horticulture reference [1]: around 24–30 °C during the growing season. Flowering and fruiting do not share a single temperature optimum.",
    planting:
      "Archival Pakistan orchard calendar [2]: February–March or August–September establishment. It is not an annual rotation slot.",
    harvest:
      "Punjab variety example [3]: SB Chaunsa, second week of July–first week of August. Other varieties differ; this is not an all-mango harvest window.",
    water:
      "Unknown local annual orchard ET/irrigation volume. Florida guidance [4] distinguishes establishment from mature trees; do not extrapolate one schedule to Punjab orchards.",
    ph: "General Indian reference [1]: well-drained, deep soils around pH 5.5–7.5 are described as ideal. Rootstock and local soil chemistry still need review.",
    drought:
      "Qualitative Florida reference [5]: established trees can be drought tolerant, while young trees need watering. Survival tolerance is not a guarantee of fruit production.",
    heat: "Variety-specific Punjab statement [3]: SB Chaunsa is listed as high-temperature tolerant. No numerical injury threshold or guaranteed heat resilience is established here.",
    applicability:
      "Punjab SB Chaunsa harvest/tolerance example; broad Indian climate/pH reference and Florida establishment guidance. Orchard age, variety, flowering weather and irrigation system must be specified.",
    sources: [
      {
        title: "National Horticulture Board, India: Mango soil and climate",
        url: "https://nhb.gov.in/bulletin_files/fruits/mango/man012.pdf",
      },
      horticultureCalendar,
      {
        title:
          "Punjab Agriculture / Mango Research: Released mango variety characteristics",
        url: "https://agripunjab.gov.pk/node/9634",
      },
      {
        title:
          "University of Florida IFAS: Mango growing in the Florida home landscape",
        url: "https://edis.ifas.ufl.edu/publication/mg216",
      },
      {
        title: "University of Florida IFAS Gardening Solutions: Mango",
        url: "https://gardeningsolutions.ifas.ufl.edu/plants/edibles/fruits/mango/",
      },
    ],
    provisional: [
      "This perennial reference is excluded from the annual rotation engine.",
      "The heat-tolerance descriptor has no supplied test protocol or quantitative stress response.",
      "Cross-region climate/pH/watering guidance needs local orchard review; no yield or carbon gain is predicted.",
    ],
  },
};
