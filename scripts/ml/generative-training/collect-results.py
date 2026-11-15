"""Collect reproducibility records and the trained small adapter for source review."""
import argparse
from pathlib import Path
import shutil

parser=argparse.ArgumentParser()
parser.add_argument('--run',default='run-1')
parser.add_argument('--data',default='dataset')
args=parser.parse_args()
cache=Path('.cache/generative-training')
docs=Path('docs/generative-training')
dest=docs/'runs'/args.run
dest.mkdir(parents=True,exist_ok=True)
for name in ['config.json','summary.json','before.json','after.json','progress.jsonl','audit.json']:
    source=cache/args.run/name
    if source.exists():shutil.copy2(source,dest/name)
adapter=dest/'adapter'
adapter.mkdir(exist_ok=True)
for name in ['adapter_config.json','adapter_model.safetensors']:
    shutil.copy2(cache/args.run/'adapter'/name,adapter/name)
data_dest=docs/'datasets'/args.data
data_dest.mkdir(parents=True,exist_ok=True)
for source in (cache/args.data).glob('*'):
    if source.is_file():shutil.copy2(source,data_dest/source.name)
for name in ['base-manifest.json','environment.txt']:
    if (cache/name).exists():shutil.copy2(cache/name,docs/name)
print(str(dest.resolve()))
