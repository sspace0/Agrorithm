# Manual data contracts

## Weather

JSON may be an array or `{ "days": [...] }`. Maximum 10,000 rows / 3 MB. Use ISO civil date strings representing **UTC** daily aggregates for parity with the bundled POWER series.

```json
[
  { "date": "2021-07-01", "min": 24.2, "max": 35.1, "rain": 0 },
  { "date": "2021-07-02", "min": null, "max": null, "rain": null }
]
```

This snippet describes the schema only and is not the genuine sample. Missing fields, duplicate dates, invalid dates, negative rain and nonfinite values are rejected. Null means missing; an absent day is also missing. Declare the dataset coordinates in Evidence. Imported data is labeled user-imported/unverified. It is the user's responsibility to supply publisher, observation dates, spatial support and quality alongside the file. Export records the import filename and status. Matching coordinates do not validate provenance.

## Farm / soil / crop dates

Export a complete JSON plan, edit `farm` fields, then restore it in Your plan. Units: area hectares; pH unitless; EC dS/m (supply extraction method in soilTexture/source); capacity mm within the stated depth; depth cm; efficiency 0–1; water limit delivered mm for the whole 36-month horizon; budget PKR. Optional boundary is GeoJSON text, retained/exported but not used as a field-resolution satellite aggregation. Empty/null values remain unknown.

`farm.sequence` is an array of `{crop,sow,harvest,residue}`. Crop ids: maize, wheat, mung, cover, rice. Harvest is an exclusive interval endpoint. `cover` harvest is termination. Crops must stay within the fixed historical comparison horizon, with actual windows and a seven-day transition. Imported dates are checked by the engine. Restore does not trust a file's precomputed results; results recompute in the browser.

To revise crop characteristics, download the editable crop registry in Evidence, change its existing crop ids, and import the JSON there. Four stage fractions must sum to one, Kc must be 0–2, and source, region/variety applicability and provisional notes are required. Imported parameters are explicitly user-supplied/unverified and are exported in the plan. Restore the bundled table with one action. The same typed registry is maintained at `src/data/crops.ts`. Economics need a future explicit dated yield/price/cost schema before any profit estimate is enabled.
