# Local helper: evidence and limits

The helper combines a reproducible descriptive weather-pattern model, documented source explanations and the current plan's computed snapshot. It is not a generative language model. It works without a remote question-answering service; questions and plan context stay in the browser session.

## Explaining a plan

The results action passes a detached snapshot of the farm name and area, entered water limit and efficiency, scenario, weather record dates and alignment, and actual decision-engine results. The helper does not recalculate or invent numbers. It shows the same 36-month horizon, distinguishes crop ET, effective rainfall, net irrigation and delivered irrigation, and carries the engine's exact hard constraints, unknowns and warnings into its answer.

An unranked result is explained using the engine's specific constraints or missing evidence. A feasible result with zero total priority weight has no aggregate index because the user has disabled all index dimensions. Missing evidence is not a favorable result. The optional index is not a probability of success or a soil-health measurement. Navigation links return to the field inputs, observations and comparisons.

## Generative-model feasibility review — 15 November 2026

Browser generation is technically possible. The reviewed [SmolLM2-135M-Instruct model card](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) permits use under Apache 2.0 and documents Transformers.js inference. Its publisher also warns that output may be factually inaccurate or logically inconsistent. It is a general language model, not a model trained on this project's NASA farm observations.

The publisher's [ONNX file inventory](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/tree/main/onnx), checked through the public Hugging Face API, listed a 117,691,126-byte q4f16 model and a 137,147,867-byte int8 model. Those are weight files alone, before the inference runtime, tokenizer, working memory and any browser cache. The reviewed [Transformers.js WebGPU documentation](https://huggingface.co/docs/transformers.js/en/guides/webgpu) describes device selection and warns of experimental support, particularly outside Chromium.

The initial unadapted generative candidates were held back. An actual browser-worker prototype loaded SmolLM2 q8 weights with successful browser CORS, taking 19.66–21.10 seconds locally. Four generated drafts took 12.54–15.68 seconds and introduced unrelated statements, unsupported vegetation interpretations or quantities. All were rejected before display by source and quantity guards.

An unadapted [FLAN-T5-small quantized candidate](https://huggingface.co/Xenova/flan-t5-small), pinned to revision `311454e83bc784267fd7eef5940ee854144abbec`, downloaded 95,098,458 bytes of encoder/merged-decoder weights and loaded in 12.70 seconds. Its two drafts completed in 0.79 and 0.44 seconds but were irrelevant or repeated instructions; both were rejected. These are local prototype timings, not device benchmarks or calibrated accuracy measurements. Those six drafts motivated the separate local adaptation and stricter scope below.

## Optional trained source reader

The optional reader uses Google FLAN-T5-small with a local LoRA adaptation on NASA-derived observation cards and documented project source explanations. Training manifests, source hashes, holdouts and limitations are recorded in `docs/generative-training/`. The underlying language model was developed by Google; this derivative is not an official NASA model or an agronomic validation.

The adapted v2 browser package contains 97,894,525 bytes across eight logical files, distributed as 30 checksum-verified static parts of at most 4 MiB. The separate WASM runtime is 21,596,019 bytes. Download requires an explicit click. The default source helper works without these files. Single-threaded WASM runs in a worker, cancellation terminates it, and model-cache deletion does not delete farm inputs.

Generation is restricted to canonical documented-topic readings and individual historical weather fields. Weather drafts must preserve the exact month, statistic, value, unit and historical caveat. Temperature headings and displayed readings explicitly say **mean daily minimum/maximum**, distinguishing them from monthly extremes. Guide statements must match supported source sentences and retain limitations. Raw user instructions do not become model instructions. Numerical plan calculations, unfamiliar tasks and broader agronomic generation remain in the deterministic source helper.

Actual v2 browser inference loaded in 5.59 seconds. The January mean-daily-minimum and July precipitation readings and the NDVI source explanation passed the output guard; a water-guide paraphrase was withheld. These four cases are software checks, not an accuracy estimate. Production-browser checks confirmed zero model requests before consent, successful generation offline after the model was loaded, working disable/cache deletion, and a visible fallback after blocked model downloads on a 390 px viewport. Fresh offline model startup, physical-phone memory and speed remain unvalidated. Evidence is in `docs/design/agrorithm/helper-results/trained-browser/`.

## Executed verification — 15 November 2026

- Thirteen focused unit checks passed for the source helper and plan-context explanations, including the exact multiline tomato question, historical follow-up dates, true plan values, missing inputs, binding water constraints, zero priorities and detached snapshots.
- TypeScript and scoped ESLint checks passed. An isolated production build completed.
- Six Playwright browser cases passed twice across the refinement cycle. The final run took 54.1 seconds and exercised 1440 × 1000 and 390 × 844 viewports, result/ranking explanations, the tomato question, date continuity, clearing a conversation, Escape/focus behavior and a denied model-file request with working documented fallback.
- Actual screenshots were inspected. The first mobile result introduction took too much space; it was shortened and the detailed provenance moved below the individual results, then the browser cases were rerun. Controls remained in bounds and no horizontal page overflow was detected.

Screenshots and the final machine-readable browser results are in `docs/design/agrorithm/helper-results/`. The deliberately water-constrained test field is a test fixture using the real decision engine and genuine cached weather; it was not added to the public sample farm. These software checks do not validate agronomic recommendations or model generalization.

The subsequent inline-opener check used fresh development-browser contexts at 1440 px and 390 px, including a touch tap on the phone viewport. Closing with Escape or the Close button restored focus to the inline **Explain my results** button with zero page-scroll change and no JavaScript errors. The results-route helper trigger was in normal document flow. Captures are in `inline-focus/`.

A separate development reset probe passed setup, loading a sample, opening export, waiting for fonts, native **Reset all inputs**, and returning to setup with the field name reset to **My field**. Reset reached report-ready in 1.85 seconds without JavaScript or console errors. Export preparation still had a 10.45-second synchronous delay in that development snapshot; font readiness took 22 ms. This was a performance concern, not a reproduced reset crash. The report's 68,040 px offscreen render did not extend the document's approximately 8,754 px scroll height after its positioning fix. These are local diagnostic timings under development mode, not device benchmarks or final production measurements. The corrected probe and screenshots are in `reset-performance-rerun/`; the earlier probe used stale selectors for a collapsed article and a renamed link.
