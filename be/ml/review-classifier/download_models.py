"""Download the two PhoBERT classifiers at pinned revisions.

Only weights and tokenizer files are fetched, never repository code (*.py), and the
models are loaded with trust_remote_code left off. The sentiment checkpoint ships as a
pickle (pytorch_model.bin); it is read with torch.load(weights_only=True), which refuses
anything but tensors, and converted to safetensors so the pickle is used exactly once.
"""

from pathlib import Path

import torch
from huggingface_hub import snapshot_download
from safetensors.torch import save_file

MODELS_DIR = Path(__file__).parent / "models"

MODELS = {
    "toxicity": {
        "repo": "visolex/phobert-v2-hsd",
        "revision": "221aca47de6568d519eba61a94d7fdae3ca680ae",
        "patterns": ["config.json", "model.safetensors", "vocab.txt", "bpe.codes", "tokenizer_config.json"],
    },
    "sentiment": {
        "repo": "wonrax/phobert-base-vietnamese-sentiment",
        "revision": "9076a5896971b5d551588fe8a51c722c89731d36",
        "patterns": ["config.json", "pytorch_model.bin", "vocab.txt", "bpe.codes", "tokenizer_config.json"],
    },
}


def convert_pickle_to_safetensors(directory: Path) -> None:
    source = directory / "pytorch_model.bin"
    if not source.exists():
        return
    state = torch.load(source, map_location="cpu", weights_only=True)
    # Safetensors rejects tensors that share memory; clone them so each is stored once.
    tensors = {name: tensor.contiguous().clone() for name, tensor in state.items()}
    save_file(tensors, directory / "model.safetensors", metadata={"format": "pt"})
    source.unlink()


def main() -> None:
    for name, spec in MODELS.items():
        target = MODELS_DIR / name
        print(f"Downloading {spec['repo']} @ {spec['revision'][:8]} -> {target}")
        snapshot_download(
            repo_id=spec["repo"],
            revision=spec["revision"],
            allow_patterns=spec["patterns"],
            local_dir=target,
        )
        convert_pickle_to_safetensors(target)
        print(f"  ready: {sorted(p.name for p in target.iterdir() if p.is_file())}")


if __name__ == "__main__":
    main()
