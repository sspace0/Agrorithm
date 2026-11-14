# Methods and limitations

## What the sample is

A regional demonstration around 32.10° N, 73.00° E in Punjab. The 2 ha area, maize–wheat baseline, dates, loam, pH 7.5, EC 1.2 dS/m, available storage 120 mm, delivery efficiency 0.65, equipment/market access and 4,500 mm three-year water limit are **demonstration inputs**. They are not observations from an interviewed farmer. No laboratory soil profile, crop survey or field water-table measurement is supplied.

The common comparison horizon is 2021-07-01 through 2024-06-30, with interval end 2024-07-01 exclusive (1,096 days). Baseline: autumn maize → wheat; alternative: kharif mungbean → wheat; alternative: maize → wheat → spring mung cover terminated 15 June. The cover has water demand, no assumed grain revenue and unpriced seed/labor/termination costs. Market and equipment selections are case assumptions, not guarantees of availability.

## Observations

POWER daily data are T2M_MIN/MAX (°C) and PRECTOTCORR (mm/day), explicitly requested in UTC, 2018–2024 (2,557 days). MERRA-2 meteorology is approximately 0.5° latitude × 0.625° longitude; point coordinates do not make it a point measurement. UTC days differ from Pakistan civil days. POWER fill −999 is mapped to null. Imports reject impossible dates, duplicate days, negative rainfall and inverted temperatures. Any incomplete day in a comparison window suppresses totals and ranking; no interpolation or missing-data advantage is applied.

HLS L30 v2.0 uses NASA/USGS reflectance through NASA's documented Microsoft mirror. The 9×9 native 30 m sampling window is 270×270 m in EPSG:32643, bounds [311130, 3553140, 311400, 3553410]. It is a regional demonstration footprint, not a surveyed field polygon. Per scene: NDVI=(B05−B04)/(B05+B04). Reflectance scale 0.0001 cancels. Reject fill, Fmask bits 0–5, high aerosol bits 6–7=3, negative or ≥12000 reflectance and nonpositive denominator. Reject mean display below 50% valid footprint coverage. Counts remain recorded even when the plotted mean is null. Nulls break the time-series line. Date is acquisition date. Granule, version, source link, tile cloud cover, processing hash and valid count remain in the cache. NDVI cannot establish crop identity, bare soil, residue, fertility, carbon or soil health.

## Crop parameters and constraints

`src/data/crops.ts` records name/family/legume, window, duration range, stage fractions/Kc, provisional heat/frost screens, illustrative root depth, equipment/market requirement, regional source and provisional notes. Crop geometry is a cereal illustration; roots are not adjusted as if measured for the selected field.

Punjab maize window: 10 July–10 August, duration roughly 90–120 d from Punjab's HEIS manual. Northern Punjab mung windows: late June–mid July and late March–mid April from the World Vegetable Center manual. Wheat uses 1–20 November, informed by PMD/Punjab references; adaptation to this exact point and cultivar is provisional. Harvest/duration and all Kc/threshold choices need local confirmation. Stage fractions are scaled over the supplied duration; they do not model phenology.

Seven days separate harvest/termination and next sowing. Sowing windows, duration, calendar overlap, horizon bounds, explicit exclusions, equipment, market and delivered-water limit are enforced. There is no unsupported universal disease-rotation prohibition; family diversity is an indicator, not disease prediction. The provisional pH 6–8.5 / EC≤4 dS/m screen is a conservative demo assumption, not a calibrated crop-specific salinity response. A local agronomist should replace it with crop/variety and test-method-specific limits. Unknown soil values make a case unresolved. Known screen violations make it infeasible under these assumptions. Neither label predicts yield.

## Water calculation

FAO 56 eqs. 21, 23–25 give daily extraterrestrial radiation Ra in MJ m⁻² d⁻¹ using latitude and day of year. Hargreaves (eq. 52):

`ET0 = max(0, 0.0023 × (Tmean + 17.8) × sqrt(Tmax − Tmin) × Ra × 0.408)` mm/day.

0.408 converts radiation energy to equivalent evaporation. Hargreaves is a screening approximation; it is not locally calibrated, and it is not FAO Penman–Monteith. Crop ET = stage Kc × ET0. Effective rainfall is an explicitly assumed fixed 80% of precipitation, not a calibrated infiltration/runoff estimator.

The single root-zone bucket starts at 50% of supplied available storage capacity. Rain adds to storage; overflow drains. On crop days, crop ET consumes storage and any deficit is filled by assumed net irrigation. Uncropped soil evaporation removes up to 0.25 ET0 from available storage. Storage carries across seasons and years. Mass accounting:

`initial storage + effective rainfall + net irrigation = final storage + crop ET + uncropped evaporation + drainage`.

Delivered irrigation = net / supplied efficiency; m³ = mm × ha × 10. The delivery loss is outside the root-zone bucket. The calculation estimates the requirement **assuming water can be supplied**, and then compares requirement with the horizon budget. A budget slider changes feasibility, not ET. It does not simulate deficit irrigation, crop stress responses, rooting change, runoff mechanics, capillary rise, salinity leaching, groundwater dynamics or actual deliveries. Unknown capacity uses provisional 100 mm for intermediate display only and prevents ranking. Unknown efficiency prevents delivered-volume calculation.

Paddy rice requires preparation, standing-water storage, seepage and percolation terms beyond ET. These terms are not parameterized, so every rice case carries an unresolved warning and no aggregate index. Any displayed root-zone ET/irrigation screening value is incomplete for paddy; never treat it as total rice irrigation.

## Exposure and cover

Count historical crop days above/below the crop's provisional max/min temperature threshold and crop days with ET greater than effective rainfall. Show these by initial/development/mid/late stage as well as totals. These are threshold counts, not damage curves, stress probabilities or forecasts. Rainfall deficit relative to ET does not mean plants were water-stressed under irrigation.

Live cover is days under a scheduled crop / common horizon. Residue-only protection counts uncropped days within 45 days after a harvest with retained residue selected. It assumes persistence; it is not a measured cover percentage or decomposition simulation. No erosion-reduction, carbon gain or nitrogen/fertilizer replacement is inferred. Legume benefit depends on management and biomass removal.

## Comparison and sensitivity

Pareto: among screening-feasible candidates only, minimize delivered water and heat+frost exposure; maximize live cover and distinct families. A dominates B only if all dimensions are no worse and at least one is strictly better. The original baseline can remain non-dominated. No forced winner.

Optional index uses fixed, clipped 0–1 scales: `1−water/6000`, live cover fraction, `families/3`, `1−exposure/horizonDays`. Weighted sum / sum(weights), ×100. Zero sum gives no index. Infeasible/unresolved cases are not ranked. Input completeness counts seven supplied dimensions, **including declared assumptions**, and is shown separately; 100% is not 100% observed or scientifically validated.

Historical replays retain crop month/day order across four consecutive 36-month windows starting July 2018/2019/2020/2021. Leap dates clamp when shifted to a non-leap year. Only fully complete windows count. They overlap and are not independent samples. Replays screen climate demand and exposure, not future yields.

Six sensitivity cases enumerate rainfall at current −20, current, current +20 percentage points (clipped at zero), crossed with Kc multipliers 0.9/1.1. Other settings remain fixed. “Top index count” includes ties. Frequencies are not calibrated success probabilities. Priority controls affect only the optional index. Economics remain unavailable without dated yield/price/cost assumptions.

## Independent worked reference

At latitude 0°, day 80, FAO equations yield Ra≈37.824 MJ m⁻² d⁻¹. For Tmin=20°C, Tmax=30°C, Tmean=25°C:

`0.0023 × 42.8 × sqrt(10) × 37.824 × 0.408 ≈ 4.804 mm/day`.

This separately evaluated arithmetic is compared with the implementation within 0.01 mm/day. A second test checks daily-bucket mass conservation to 10⁻⁶ mm and delivered/net/area conversion. These verify software arithmetic, not the applicability of Hargreaves or the bucket to this farm.

## Visual interpretation

Root-zone demo layers 0–0.46, 0.46–1.24 and 1.24–2.06 m are illustrative. The groundwater view explicitly changes to a 0–20 m conceptual scale. User-controlled 3–15 m water table is not measured or coupled to NASA moisture. Blue dots lie within solid sediment; they represent pore water. Animation direction explains rainfall/infiltration/uptake/evaporation; particle motion has no modeled velocity. Root-zone water totals are shown in HTML outside the canvas. No SMAP or GRACE inference is used.
