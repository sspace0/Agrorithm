# Independent release audit — 15 November 2026

This was a bounded executed review, not a continuously running monitor. Application source and assets were read-only during this audit. Test inputs and temporary screenshots stayed under the ignored `.cache` directory.

## Presentation report

Independently opened the delivered sample PDF, checked all 50 page boxes at 1440 × 810 points and its 3,590,567-byte size, and verified embedded Century Gothic regular/bold and Instrument Serif italic font resources. Inspected all five final contact sheets, plus full-size water, NDVI, aligned-calendar and paired model pages. No clipped chart labels, table columns, running headings or model captions were found in these renders. Continuation tables retain headings and readable margins.

The report distinguishes observations, assumed farm inputs, screening calculations and illustrative geometry. The two model views explicitly use different depth scales, with the 7 m groundwater boundary labeled a demo assumption. NDVI missingness is visible; the text does not infer crop identity, residue, nutrients or carbon from it. Sensitivity cases are not presented as success probabilities. The PDF will need regeneration if the groundwater poster changes after this snapshot.

## NASA weather model

Audited `scripts/ml/train_weather_patterns.py` and the initial `public/data/weather-patterns.json` artifact. Independently recomputed monthly features directly from the genuine daily cache without importing the training helper: all 84 complete months match. The 60 training months end in December 2022; the 24 held-out months begin in January 2023. Training-only means, population scales, native cluster centers, all 84 nearest-center assignments and both quantization metrics match the artifact.

Independent standardized-distance RMSE: training **0.8878270457315801**, held-out **0.9657961777899744**. These measure historical clustering distance; they are not classification accuracy, calibrated confidence or forecast skill. Initial artifact SHA-256: `49f96f63b52731c835f3393fdc36ca0408f7356907607390ab12168a67087269`. A subsequent provenance-validation edit may change the artifact checksum without changing these learned centers.

The fixed four-cluster choice, small regional sample, correlated features and strong seasonality are disclosed. The model supplies no learned crop suitability, yield, irrigation, soil-carbon or groundwater result. The current declared point agrees with the raw response geometry. A future-validation improvement was sent to the model implementer: reject declared coordinate/time-standard metadata that disagrees with the verified raw response context, not only altered daily values/checksums. UI integration and any subsequent model revision require their own checks.

## Static navigation and layout

Executed ten fresh-browser route/viewport checks: opening, field setup, evidence, scenarios and export at 768 × 1024 and 390 × 844. Graphics quality was explicitly Static; every view had zero canvas elements. There were no page JavaScript errors or document horizontal overflows. Field-name input survived setup → evidence → setup navigation at both sizes. Inspected actual captured tablet/phone screens, including the restored weather charts. These checks do not replace the separate WebGL model review or physical-device testing.

Two nonblocking polish findings were reported for follow-up:

- At 768 px, the sidebar plus the two-column scenario layout leaves a narrow quantitative card. The chart automatically omits its middle category label and numeric result rows wrap heavily. Collapse that section to one column when available content width is insufficient; the table still preserves every option.
- Recharts series keep their default drawing animation independently of the app's motion setting. Early screenshots can therefore show a partially drawn historical line after the loader exits. Disable these data-chart animations or explicitly connect them to reduced-motion state; wait for settled chart paint in screenshot tests. The underlying 2024 source values are present.

The audit's temporary evidence is `.cache/independent-release-audit.json` and `.cache/release-audit/`. No farmer/agronomist validation, future forecast accuracy or integrated-graphics frame-rate claim follows from these software and visual checks.
