# Historical weather-pattern model

This is a small, trained unsupervised learning model for exploring similar historical months at the configured Punjab pilot point, 32.1° N, 73° E. It is separate from the deterministic rotation engine and the curated question guide. It is not a trained language model, forecast, crop recommender, yield predictor, drought classification or aquifer simulation.

## Data and provenance

The input is the genuine cached NASA POWER daily point-API record `public/data/weather.json`, covering 1 January 2018–31 December 2024 in UTC: 2,557 daily rows. Parameters are T2M_MIN and T2M_MAX in °C, and PRECTOTCORR in mm/day. Their meteorological spatial support is the regional MERRA-2 grid, approximately 0.5° latitude × 0.625° longitude. These are regional gridded historical data, not a farm sensor or field-resolution measurement.

Before training, the script verifies SHA-256 checksums of all seven raw yearly responses against `public/data/provenance.json` and compares every processed daily value with those verified raw responses. It also checks raw/processed coordinate consistency, UTC time standard, parameter units, response year bounds and declared observation coverage. The final yearly header retained in the processed cache describes 2024; the verified daily rows cover all seven years.

The model artifact records source URLs, product/API version, cache retrieval dates, source checksum, raw response checksums and its own model version. No personal plans, device locations, crop yields or synthetic test fixtures enter training. The daily sample and model are bundled for static hosting and offline use; no remote inference service, API key or browser token is involved.

## Features and missingness

Each month uses four features: arithmetic mean daily minimum temperature (°C), arithmetic mean daily maximum temperature (°C), total precipitation (mm/month), and the fraction of calendar days with precipitation below 1 mm/day. The last threshold is a descriptive convention; it does not diagnose agronomic drought.

A month is accepted only when every expected calendar day exists and all three daily source parameters are finite and valid. Duplicate dates are rejected. Missing sentinels, negative precipitation or minimum temperature above maximum invalidate that day and exclude its month. No imputation, partial-month extrapolation or rainfall upscaling is performed. Leap years use actual calendar month lengths. All 84 months in this cache are complete; none were excluded.

## Fitting and chronological holdout

January 2018–December 2022 supplies 60 training months. January 2023–December 2024 supplies 24 held-out months. Training-only means and population standard deviations standardize each feature. Constant feature scales use 1 to avoid division by zero. Held-out observations never fit scaling, centers, names, initializations or run selection.

The implementation uses Lloyd k-means with k-means++ initialization, four clusters, seed 20261115 and 24 deterministic restarts, stopping on unchanged training memberships or 300 iterations. The run with lowest training inertia is retained with a deterministic tie break. Four clusters are a compact demonstration choice; no claim is made that four is a universal or optimal classification. Labels are derived from training center temperatures relative to the training midpoint-temperature distribution and rainfall relative to the training monthly mean. They are relative descriptions, not crop thresholds.

The serialized centers are used directly by the browser. Inference standardizes all four features with the fitted training scaler and chooses the nearest center by Euclidean distance. Missing or invalid features leave the comparison unresolved; the browser never compares a shorter feature vector. Custom inputs are clearly hypothetical, do not change the cached observation record or refit the model, and display an extrapolation warning outside any training feature range. Membership and distance do not imply confidence, suitability or probability.

## Actual training and verification

The training script was executed on 15 November 2026 using the Python standard library. It produced `public/data/weather-patterns.json`: **54,026 bytes**, model `power-monthly-kmeans-1.0.0`, with 84 complete monthly aggregates and four learned centers. Training quantization RMSE is **0.887827045732** and held-out quantization RMSE is **0.965796177790**, in standardized feature-distance units. These errors quantify distance from learned historical centers; they are not predictive accuracy or future-climate validation. Training memberships are 20, 14, 10 and 16 months across the four centers.

Seven Python software tests pass: complete/leap-month and sentinel handling, duplicates, verified source equivalence and chronological split, held-out perturbation without refitting, deterministic repeatability and constant features, serialized assignments/distances, coordinate/date tampering, and raw metadata mismatch even after its checksum is updated. Five TypeScript tests pass browser-inference parity for all 84 months, missing/invalid inputs, corrupt schema/scaler, chronological coverage and training-only extrapolation ranges. Four further helper tests cover named/ISO months, date ambiguity, genuine held-out answers, unsupported prediction requests and source-guide fallback. An independent implementation recomputed all aggregates, scaling, centers, assignments and both RMSEs and agreed with the artifact.

## On-device question helper

The separate floating botanical O button opens a native modal sidebar on every page. It is independent of the header's home-link logo and repositions above visible planning footers or model controls. It combines exact, local question routing with the learned monthly model and the existing source-linked project guide. Named/ISO month questions use the actual learned scaler/centers and monthly observations; they do not substitute a generated numerical answer. Training questions expose the fit/holdout and distance interpretation. Guide questions retrieve an existing documented explanation with its source. Unsupported questions and unavailable months produce explicit limits, and ambiguous dates require clarification. It is a constrained conversational interface, not a generative language model.

Questions and conversation history stay in memory in the current browser session. They are not sent to a model provider, stored in a database, written into the NASA cache or published with the project. The small model file loads from the same static origin when needed; documented guide answers remain usable if that file fails. The sidebar preserves its conversation across hash navigation, supports Escape/native focus containment and focus return, and responds to visual-viewport changes for mobile keyboards. Closing or clearing the conversation does not delete farmer plans.

The standalone `#/weather-patterns` page remains the detailed scientific view, reachable through global search, the guide and the sidebar. Desktop and phone browser checks exercised the actual 84-month calendar, hypothetical-input missingness/extrapolation, modeled answers, offline guide, navigation continuity and keyboard behavior. Inspection found a phone table clipping issue and corrected it to fit the visible frame; long model responses scroll inside the sidebar with the newest answer heading initially visible. Screenshot evidence is under `docs/design/agrorithm/learning/`; `scripts/ml/helper-ui-qa.mjs` repeats the targeted visual checks.

## Rebuild

```sh
python scripts/ml/train_weather_patterns.py
python -m unittest discover -s scripts/ml -p 'test_*.py' -v
pnpm exec vitest run tests/weatherPatterns.test.ts
```

The script supports `--input` and `--output` paths, but this model version deliberately requires the documented verified 2018–2024 cache and provenance layout. Extending the period or geographic training scope requires a new reviewed model/data version. Regenerating from an unrelated or partial cache must fail rather than silently changing its meaning.

## Scientific limitations

Seven years at one point and only 60 training months are a very small sample. Seasonal persistence and correlated features mean observations are not independent trials. Tmin and Tmax both contribute to distance; rainfall and dry-day fraction are also correlated. Rainfall totals depend partly on month length. Held-out assignment is descriptive evaluation on supplied historical values, not prediction of values that were unknown beforehand. Grid spacing does not create field detail, and this model has no soil, crop, irrigation or yield training labels. Its clusters cannot validate a rotation or strengthen an agronomic recommendation. Real farmer/agronomist review and a suitable independent dataset are required before considering a different decision role.

Primary references: [NASA POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), [NASA POWER methodology](https://power.larc.nasa.gov/docs/methodology/), and [k-means algorithm overview](https://scikit-learn.org/stable/modules/clustering.html#k-means). The implementation uses no scikit-learn dependency; the algorithm reference explains the method.
