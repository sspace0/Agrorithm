"""Download only pinned public data/weights, recording actual SHA-256 values."""
import hashlib
import json
from pathlib import Path
import urllib.request

REPO = "google/flan-t5-small"
REVISION = "0fc9ddf78a1e988dac52e2dac162b0ede4fd74ab"
DEST = Path(".cache/generative-training/base")
FILES = ["config.json", "generation_config.json", "model.safetensors", "special_tokens_map.json",
         "spiece.model", "tokenizer.json", "tokenizer_config.json", "README.md"]
DEST.mkdir(parents=True, exist_ok=True)
manifest = {"repo": REPO, "revision": REVISION, "license": "Apache-2.0", "files": {}}
for name in FILES:
    file = DEST/name
    url = f"https://huggingface.co/{REPO}/resolve/{REVISION}/{name}"
    if not file.exists():
        print("Downloading " + name, flush=True)
        partial = file.with_suffix(file.suffix + ".part")
        urllib.request.urlretrieve(url, partial)
        partial.replace(file)
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    manifest["files"][name] = {"url": url, "bytes": file.stat().st_size, "sha256": digest}
(DEST.parent/"base-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
print(json.dumps(manifest, indent=2), flush=True)
