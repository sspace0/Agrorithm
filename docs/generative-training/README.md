# Local generative helper experiment

This experiment performs supervised LoRA parameter training on FLAN-T5-small. It is separate from the published descriptive k-means weather model and the existing grounded helper. Its role is to phrase supplied evidence in natural language. It does not learn a weather forecast, a yield predictor, a field measurement or an agronomic recommendation model.

The model base is [`google/flan-t5-small`](https://huggingface.co/google/flan-t5-small/tree/0fc9ddf78a1e988dac52e2dac162b0ede4fd74ab), pinned to `0fc9ddf78a1e988dac52e2dac162b0ede4fd74ab`, under Apache-2.0. The local downloader records actual file SHA-256 values; no remote Python model code is executed. The original base model was instruction tuned by Google. The additional Agrorithm adaptation uses locally prepared, source-derived instruction/answer examples. It is not a NASA-trained language model.

## Evidence and split

`build-dataset.mjs` reads the actual public weather and HLS JSON, plus the project's documented guide, crop references, crop registry and calculation source. The checked run contains 2,557 daily NASA POWER observations from 2018-01-01 through 2024-12-31, and 43 HLS L30 v2.0 observations during 2023, with 16 displayed NDVI values. Each generated example retains source-file hashes.

The supervised set contains 258 examples. The 39 template holdouts use unseen question forms and historical weather from 2023–2024; crop heat references are also held out of gradient updates. The 22 task holdouts include multi-field weather summaries, missing-NDVI reasoning, inverse unit conversion and attempts to override source limitations. Source-card content is intentionally available to the model at inference. Guide template tests reuse documented source facts and targets; they test new wording, not knowledge of an unseen domain. The split is not a random division of near-duplicate question rows.

Targets are constructed from public observations and existing source text. They have not been independently annotated by agronomists. Small-set results cannot establish general agronomic correctness. Unknown groundwater, nutrient and carbon quantities remain unknown; crop traits and engine thresholds remain general or provisional as labeled in their owning source.

## Reproduce

Use an isolated Python 3.12 environment. The initial run used CPU-only PyTorch and at most four compute threads on the user's existing laptop. Dependencies are not added to the website package.

```powershell
python -m venv .cache/generative-training-venv
& .cache/generative-training-venv/Scripts/python.exe -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
& .cache/generative-training-venv/Scripts/python.exe -m pip install -r scripts/ml/generative-training/requirements.txt
node scripts/ml/generative-training/build-dataset.mjs
& .cache/generative-training-venv/Scripts/python.exe scripts/ml/generative-training/download-base.py
& .cache/generative-training-venv/Scripts/python.exe -u scripts/ml/generative-training/train.py --steps 240 --threads 4
```

The run saves an actual trained adapter, a merged model, all generation outputs before and after training, measured timings, per-step loss, source and artifact hashes, and an environment lock. The model has 344,064 trainable LoRA parameters (rank 8, q/v projections), among 77,305,216 total parameters including adapters. The optimizer is AdamW at learning rate 0.002, batch size 2 and seed 2833. The training loop uses only the training JSONL file; holdouts are used only for evaluation. No cloud credentials or API credits are used.

For an ONNX browser candidate:

```powershell
& .cache/generative-training-venv/Scripts/python.exe -m pip install -r scripts/ml/generative-training/requirements-export.txt
& .cache/generative-training-venv/Scripts/python.exe scripts/ml/generative-training/export-onnx.py
```

Export validation compares the full-precision ONNX graphs with PyTorch. Subsequent dynamic q8 quantization is a separate transformation and requires browser quality checks. ONNX file validation alone does not prove useful answers or acceptable phone performance.

To reproduce the second bounded continuation and its unchanged/fresh audits:

```powershell
node scripts/ml/generative-training/augment-dataset.mjs
& .cache/generative-training-venv/Scripts/python.exe -u scripts/ml/generative-training/train.py --data .cache/generative-training/dataset-2 --out .cache/generative-training/run-2 --initial-adapter .cache/generative-training/run-1/adapter --steps 400 --threads 4 --learning-rate 0.001
& .cache/generative-training-venv/Scripts/python.exe scripts/ml/generative-training/audit.py --run .cache/generative-training/run-2
& .cache/generative-training-venv/Scripts/python.exe scripts/ml/generative-training/export-onnx.py --model .cache/generative-training/run-2/merged --out .cache/generative-training/browser-model-2 --fp32 .cache/generative-training/onnx-fp32-2
```

See `RESULTS.md` and the retained `runs/` records for the actual measured failures as well as improvements. The published runtime is maintained separately; this source package does not by itself establish that a particular model version has been published.

## Evaluation meaning

`before.json` and `after.json` retain the questions, context, reference target, actual generated answer and runtime. Numeric tasks require explicitly listed dates, values and units; invented numeric tokens and selected forbidden phrases fail a check. Refusal tasks must retain a limitation. Exact string checks can reject equivalent formatting and cannot detect every semantic error. Rows without explicit numeric requirements need manual review; a vacuous literal check is never an answer-accuracy claim. Loss reduction is not answer accuracy.

The production integration should retain deterministic source facts and citations, run generation in an optional worker, reject unsupported or incomplete drafts, and fall back to the grounded answer. Generalization on new tasks, semantic consistency, refusal behavior, browser quantization drift and real-device resource use remain release criteria.
