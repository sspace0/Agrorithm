"""Export the trained merged checkpoint and quantize a local Transformers.js candidate."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import time

os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("MKL_NUM_THREADS", "4")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
import torch
import onnx
from optimum.exporters.onnx import main_export
from onnxruntime.quantization import QuantType, quantize_dynamic

parser = argparse.ArgumentParser()
parser.add_argument("--model",default=".cache/generative-training/run-1/merged")
parser.add_argument("--out",default=".cache/generative-training/browser-model")
parser.add_argument("--fp32",default=".cache/generative-training/onnx-fp32")
parser.add_argument("--reuse-fp32",action="store_true")
args = parser.parse_args()
torch.set_num_threads(4)
torch.set_num_interop_threads(1)
started = time.monotonic()
fp32, out = Path(args.fp32), Path(args.out)
out.mkdir(parents=True,exist_ok=True)
(out/"onnx").mkdir(exist_ok=True)
print("Exporting trained checkpoint to ONNX on CPU",flush=True)
if not args.reuse_fp32:
    main_export(args.model,output=fp32,task="text2text-generation-with-past",opset=18,device="cpu",atol=1e-4,
                do_validation=True,no_post_process=False,local_files_only=True)
for file in Path(args.model).glob("*"):
    if file.suffix in {".json",".model"}:
        shutil.copy2(file,out/file.name)
for name in ("encoder_model","decoder_model_merged"):
    source = fp32/(name+".onnx")
    dest = out/"onnx"/(name+"_quantized.onnx")
    print("Quantizing " + source.name,flush=True)
    quantize_dynamic(str(source),str(dest),per_channel=False,weight_type=QuantType.QInt8,
                     op_types_to_quantize=["MatMul","Gather"],extra_options={"EnableSubgraph":True,"MatMulConstBOnly":True})
files={str(file.relative_to(out)).replace("\\","/"):{"bytes":file.stat().st_size,"sha256":hashlib.sha256(file.read_bytes()).hexdigest()}
       for file in out.rglob("*") if file.is_file()}
manifest={"schema":1,"model":"agrorithm-flan-t5-small-lora-1","base":"google/flan-t5-small",
          "revision":"0fc9ddf78a1e988dac52e2dac162b0ede4fd74ab","license":"Apache-2.0",
          "trainingRun":"run-1","seconds":time.monotonic()-started,"dtype":"q8",
          "backend":"Transformers.js 3.8.1 / ONNX Runtime WASM candidate; browser verification required",
          "files":files,"totalBytes":sum(info["bytes"] for info in files.values())}
manifest['trainingRun']=Path(args.model).parent.name
manifest['model']='agrorithm-flan-t5-small-lora-'+manifest['trainingRun'].replace('run-','')
manifest['onnxOpset']=[{'domain':op.domain,'version':op.version} for op in onnx.load(fp32/'encoder_model.onnx').opset_import]
(out.parent/(out.name+"-manifest.json")).write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf8")
print(json.dumps(manifest,indent=2),flush=True)
