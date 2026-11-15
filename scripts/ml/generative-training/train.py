"""Bounded CPU LoRA training, with generation-based before/after evaluation.

Run with the isolated requirements.txt environment; never loads remote Python code.
The model is trained to verbalize supplied evidence, not to predict agronomy.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import random
import re
import time
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("MKL_NUM_THREADS", "4")

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, DataCollatorForSeq2Seq
from peft import LoraConfig, TaskType, get_peft_model, PeftModel

MODEL = "google/flan-t5-small"
REVISION = "0fc9ddf78a1e988dac52e2dac162b0ede4fd74ab"
SEED = 2833

def sha(path):
    value = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()

def dump(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")

def prompt(row):
    return ("Answer using only the source. Keep the source numbers, units and limits. "
            "Say unknown when the evidence is missing.\nSource: " + row["context"] +
            "\nQuestion: " + row["question"] + "\nAnswer:")

def checks(row, answer):
    lower = answer.casefold()
    required = {term: term.casefold() in lower for term in row["required"]}
    forbidden = [term for term in row["forbidden"] if term.casefold() in lower]
    # Checks cannot establish semantic truth. They catch invented numeric tokens,
    # missing explicitly required dates/units and a narrow set of affirmative claims.
    permitted_numbers = set(re.findall(r"\d+(?:\.\d+)?", row["context"] + " " + row["question"]))
    novel_numbers = sorted(set(re.findall(r"\d+(?:\.\d+)?", answer)) - permitted_numbers)
    limit_task = row["task"] in {"bounded_refusal", "prompt_injection", "hls_missing_reason"}
    contains_limit = bool(re.search(r"\b(cannot|can't|unknown|not|no|missing|insufficient|unresolved)\b", lower))
    # No keyword-based score is represented as agronomic answer accuracy.
    return {"requiredLiterals": required, "missingLiterals": [k for k,v in required.items() if not v],
            "forbiddenPhrases": forbidden, "novelNumericTokens": novel_numbers,
            "limitPresent": contains_limit if limit_task else None,
            "literalPass": all(required.values()) and not forbidden and not novel_numbers and (contains_limit or not limit_task),
            "numericTask": bool(row["required"])}

def evaluate(model, tokenizer, rows, path):
    model.eval()
    results = []
    started = time.monotonic()
    for i, row in enumerate(rows):
        encoded = tokenizer(prompt(row), return_tensors="pt", truncation=True, max_length=384)
        begin = time.monotonic()
        with torch.inference_mode():
            generated = model.generate(**encoded, do_sample=False, max_new_tokens=128, num_beams=1,
                                       repetition_penalty=1.08, no_repeat_ngram_size=4)
        answer = tokenizer.decode(generated[0], skip_special_tokens=True)
        result = {"id": row["id"], "split": row["split"], "task": row["task"], "question": row["question"],
                  "context": row["context"], "reference": row["answer"], "answer": answer,
                  "seconds": time.monotonic()-begin, "checks": checks(row, answer)}
        results.append(result)
        if (i+1)%10 == 0:
            print(json.dumps({"event": "evaluation", "file": str(path), "completed": i+1, "total": len(rows)}), flush=True)
        dump(path, {"partial": True, "results": results})
    groups = {}
    for split in sorted({r["split"] for r in results}):
        selected = [r for r in results if r["split"] == split]
        numeric = [r for r in selected if r["checks"]["numericTask"]]
        limits = [r for r in selected if r["checks"]["limitPresent"] is not None]
        groups[split] = {"n": len(selected), "strictLiteralPass": sum(r["checks"]["literalPass"] for r in selected),
            "numericTasks": len(numeric), "numericTaskPass": sum(r["checks"]["literalPass"] for r in numeric),
            "novelNumberResponses": sum(bool(r["checks"]["novelNumericTokens"]) for r in selected),
            "limitTasks": len(limits), "limitPresent": sum(bool(r["checks"]["limitPresent"]) for r in limits)}
    report = {"partial": False, "seconds": time.monotonic()-started, "groups": groups,
              "metricLimit": "Strict literal/source-bound checks, not answer accuracy. Guide and crop rows without required literals require human semantic review.",
              "results": results}
    dump(path, report)
    print(json.dumps({"event": "evaluation_complete", "file": str(path), "groups": groups, "seconds": report["seconds"]}), flush=True)
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=".cache/generative-training/dataset")
    parser.add_argument("--base-model", default=".cache/generative-training/base")
    parser.add_argument("--initial-adapter")
    parser.add_argument("--out", default=".cache/generative-training/run-1")
    parser.add_argument("--steps", type=int, default=240)
    parser.add_argument("--max-train-seconds", type=int, default=1200)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=0.002)
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(min(4, max(1,args.threads)))
    torch.set_num_interop_threads(1)
    random.seed(SEED)
    torch.manual_seed(SEED)
    data = Path(args.data)
    read = lambda name: [json.loads(line) for line in (data/(name+".jsonl")).read_text(encoding="utf8").splitlines()]
    train_rows = read("train")
    eval_rows = read("template_holdout") + read("task_holdout")
    if (data/"fresh_template_holdout.jsonl").exists():
        eval_rows += read("fresh_template_holdout")
    assert not {r["id"] for r in train_rows}.intersection(r["id"] for r in eval_rows)
    started = time.monotonic()
    print(json.dumps({"event": "loading", "model": MODEL, "revision": REVISION}), flush=True)
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, local_files_only=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.base_model, local_files_only=True, use_safetensors=True)
    if args.initial_adapter:
        model = PeftModel.from_pretrained(model,args.initial_adapter,is_trainable=True,local_files_only=True)
    tokenizer.save_pretrained(out/"tokenizer")
    config = {"model": MODEL, "revision": REVISION, "seed": SEED, "torch": torch.__version__,
              "threads": torch.get_num_threads(), "args": vars(args),
              "baseHashes": {file.name: sha(file) for file in Path(args.base_model).glob("*") if file.is_file()},
              "datasetHashes": {file.name: sha(file) for file in data.glob("*") if file.is_file()},
              "trainingExamples": len(train_rows), "evalExamples": len(eval_rows)}
    dump(out/"config.json", config)
    before = evaluate(model, tokenizer, eval_rows, out/"before.json")
    lora = LoraConfig(task_type=TaskType.SEQ_2_SEQ_LM, r=8, lora_alpha=16, lora_dropout=0.05,
                      target_modules=["q", "v"], bias="none")
    if not args.initial_adapter:
        model = get_peft_model(model, lora)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(json.dumps({"event":"adapter_ready", "trainable":trainable,"total":total}), flush=True)
    encoded_rows = []
    for row in train_rows:
        encoded = tokenizer(prompt(row), truncation=True, max_length=384)
        encoded["labels"] = tokenizer(text_target=row["answer"], truncation=True, max_length=160)["input_ids"]
        encoded_rows.append(encoded)
    collate = DataCollatorForSeq2Seq(tokenizer, model=model, label_pad_token_id=-100)
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.learning_rate)
    losses = []
    train_started = time.monotonic()
    indices = list(range(len(encoded_rows)))
    random.shuffle(indices)
    position = 0
    progress = out/"progress.jsonl"
    progress.write_text("", encoding="utf8")
    model.train()
    for step in range(1,args.steps+1):
        if position+args.batch_size > len(indices):
            random.shuffle(indices)
            position = 0
        chosen = indices[position:position+args.batch_size]
        position += args.batch_size
        batch = collate([encoded_rows[i] for i in chosen])
        optimizer.zero_grad(set_to_none=True)
        loss = model(**batch).loss
        if not torch.isfinite(loss):
            raise RuntimeError("Non-finite training loss")
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        losses.append(float(loss.detach()))
        event = {"step":step,"loss":losses[-1],"meanLast10":sum(losses[-10:])/len(losses[-10:]),
                 "seconds":time.monotonic()-train_started}
        with progress.open("a",encoding="utf8") as stream: stream.write(json.dumps(event)+"\n")
        if step%10==0:
            print(json.dumps({"event":"training",**event}),flush=True)
        if step%40==0:
            model.save_pretrained(out/"adapter")
            dump(out/"checkpoint.json",event)
        if time.monotonic()-train_started >= args.max_train_seconds:
            print(json.dumps({"event":"time_budget_reached",**event}),flush=True)
            break
    train_seconds = time.monotonic()-train_started
    model.save_pretrained(out/"adapter")
    tokenizer.save_pretrained(out/"adapter")
    after = evaluate(model, tokenizer, eval_rows, out/"after.json")
    merged = model.merge_and_unload()
    merged.save_pretrained(out/"merged", safe_serialization=True)
    tokenizer.save_pretrained(out/"merged")
    artifact_hashes = {str(file.relative_to(out)): sha(file) for folder in ("adapter","merged") for file in (out/folder).glob("*") if file.is_file()}
    summary = {**config,"trainableParameters":trainable,"totalParameters":total,"completedSteps":len(losses),
               "trainingSeconds":train_seconds,"totalSeconds":time.monotonic()-started,
               "first10Loss":sum(losses[:10])/len(losses[:10]),"last10Loss":sum(losses[-10:])/len(losses[-10:]),
               "before":before["groups"],"after":after["groups"],"artifactSha256":artifact_hashes,
               "releaseStatus":"experimental; requires semantic review and browser ONNX verification; not a crop advisor"}
    dump(out/"summary.json",summary)
    print(json.dumps({"event":"complete",**summary}),flush=True)

if __name__ == "__main__": main()
