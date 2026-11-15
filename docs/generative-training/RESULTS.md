# Measured training results

These are small, local evidence-verbalization experiments. Metrics below are checks on the retained prompts and source cards, not general answer accuracy or agronomic validation.

## Run 1

The first run trained 344,064 LoRA parameters for 240 optimizer steps on 258 source-derived examples. Training took 147.34 seconds on four CPU threads. Mean first-ten training loss was 2.247; mean last-ten loss was 0.304. The base checkpoint, adapter weights, source hashes, dataset, complete generations and per-step losses are retained alongside this report.

The stricter audit checks date presence, explicit value/unit pairs and association with the requested weather field. It supplements the original literal checks without changing their saved outputs.

| Check set | Before adaptation | After run 1 |
| --- | ---: | ---: |
| Same-task numerical examples with new templates/dates | 0/21 | 21/21 |
| Valid numerical examples from originally unseen task families | 0/12 | 1/12 |

Two HLS task questions incorrectly presupposed missing NDVI when their source cards contained a valid value. They are retained unchanged, marked in the audit and excluded from the second row. This makes the evaluation defect visible rather than silently revising the benchmark.

Manual source comparison found these material limitations:

- All six requested multi-field weather summaries returned precipitation alone, omitting both temperature means.
- Missing-NDVI causal questions returned an observation value rather than explaining the suppression threshold.
- Only one of three inverse-conversion responses gave the requested computed depth. Another assigned a legitimate source number to the wrong unit. Checking only whether numbers appear somewhere in the source would miss that error.
- A guarantee challenge produced “No harvest is guaranteed. This is a guarantee.” Other challenge responses called missing root measurements invalid or described evidence as false without source support. A simple check for the word “not” would falsely accept these responses.
- Most guide and crop-reference template responses closely copied the supplied source; minor wording and spelling distortions remained. Repeating known source text does not prove useful generalization.

Run 1 is a real trained artifact, but it is unsuitable as an unrestricted assistant. An optional browser candidate was exported as a merged-decoder T5 ONNX model and dynamically quantized. The q8 files total about 94.64 MB before tokenizer/config files. Export validation reported a maximum full-precision absolute difference of 0.0000668 against a strict 0.00001 default tolerance; the discrepancy and browser testing must be considered separately from training quality.

## Run 2 protocol

The second run continues the first adapter on 657 training examples, adding multi-field source reading, explicit number/unit bindings, missing-observation reasoning and source-limit counterexamples. Arithmetic outputs are computed in the source card before the language model reads them. Training weather remains restricted to 2018–2022. Original evaluation examples are copied byte-for-byte and excluded from gradient inputs. Fourteen fresh question-template examples are also evaluated.

Because formerly unseen task families now appear in the training augmentation, the original task test becomes an unchanged regression and unseen-example audit. It must not be described as a fresh unseen-task-family result. The fresh question templates also share domain facts with the source corpus; they are not independent domain or field validation.

Production use remains opt-in and guarded. Deterministic values, source citations and the grounded helper stay authoritative. Generated drafts must be rejected when they omit required facts, attach a value to the wrong field/unit, reverse a caveat, assert an unsupported outcome or fail other semantic checks.

### Run 2 observations

The continuation completed 400 additional optimizer steps in 326.84 seconds, with mean first-ten loss 0.874 and last-ten loss 0.093. This makes 640 optimizer steps across both runs. Full before-and-after generation for the 75 evaluation prompts took place outside gradient updates.

| Strong audit | Before continuation | After run 2 |
| --- | ---: | ---: |
| Original same-task numerical templates/dates | 21/21 | 21/21 |
| Original valid numerical task audit | 1/12 | 1/12 |
| Fresh multi-field templates, including daily-statistic labels | 0/6 | 0/6 |

The eight original source-override challenges no longer produced the specific guarantee contradiction, “false evidence” claim or missing-root-measurement reversal seen in run 1. This is a limited improvement on those retained prompts, not proof of robust refusal.

The fresh multi-field responses copied all three numerical values but changed **mean daily maximum** to **mean weekly maximum** in all six cases. The original loose literal checks report 6/6 because they miss this semantic error; the strengthened audit correctly rejects them. A fresh forecast-limit question also produced contradictory weather wording. A conversion response still attached a supplied volume to millimetres. Therefore neither the loose 14/14 fresh-template result nor the falling loss can be reported as reliable answer accuracy.

Run 2 is retained as a second actual trained artifact. It remains suitable only as a candidate for narrow, verified source-card wording with a strict runtime rejection policy. Broader multi-field explanations, arithmetic, unsupported agronomic outcomes and source-override questions must continue to use the grounded helper or a clear unsupported answer.

The run 2 export took 43.55 seconds, uses ONNX opset 18, and completed full-precision validation at an explicitly configured absolute tolerance of 0.0001 without value-difference warnings. Its two q8 model files plus tokenizer/config assets total 97,894,525 bytes. Quantized browser acceptance and actual publication are separate checks owned by the application integration; the manifest alone does not establish either.

## Observed public browser verification

Sites version 9 was exercised anonymously on 15 November 2026 UTC (16 November in Pakistan). After explicit consent, the browser downloaded the local runtime and model, then generated the source-checked July 2023 precipitation reading of **259.09 mm**. Cold model loading took **35.56 seconds** and generation took **3.17 seconds** in headless Chromium on the development computer. These timings are not phone or integrated-GPU benchmarks. All 37 observed model/runtime responses returned HTTP 200; no model weights were requested before consent. The tokenizer's exact size and SHA-256 matched the immutable manifest.

The 390-pixel layout kept the accepted response in bounds. An intentionally failed download preserved the grounded source answer. Greeting and scientific-subscript checks passed with no JavaScript page errors. Evidence is retained under `docs/design/agrorithm/helper-results/live-reader-v9/`. An earlier version 8 publication failed integrity checks because Git changed line endings in JSON-containing model parts; `.gitattributes` now preserves all model parts byte-for-byte. Hash checks remain mandatory. This successful narrow source reading does not change the generalization limitations measured above.
