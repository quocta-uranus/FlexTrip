"""Local Vietnamese classifiers used as the cheap first stage of review moderation.

Two PhoBERT models run on CPU:
  * toxicity  - visolex/phobert-v2-hsd, labels CLEAN / OFFENSIVE / HATE
  * sentiment - wonrax/phobert-base-vietnamese-sentiment, labels NEG / POS / NEU

The toxicity repository ships its own wrapper class (models.py). That code is never
executed: the wrapper is only an encoder with its pooled output fed to one linear
layer, so it is rebuilt here from standard transformers classes and the safetensors
weights are loaded into it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import torch
from pyvi import ViTokenizer
from safetensors.torch import load_file
from torch import nn
from transformers import (
    AutoConfig,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    RobertaModel,
)

MODELS_DIR = Path(__file__).parent / "models"
MAX_LENGTH = 256

SENTIMENT_LABELS = {"NEG": "NEGATIVE", "POS": "POSITIVE", "NEU": "NEUTRAL"}


class PooledClassifier(nn.Module):
    """Encoder -> pooler output -> dropout -> linear, as in the toxicity checkpoint."""

    def __init__(self, directory: Path):
        super().__init__()
        config = AutoConfig.from_pretrained(directory)
        state = load_file(directory / "model.safetensors")
        # The repository's config.json is minimal and leaves the RoBERTa defaults in place;
        # the real sizes are those of PhoBERT-base-v2, so read them from the weights.
        embeddings = "encoder.embeddings."
        config.vocab_size, config.hidden_size = state[embeddings + "word_embeddings.weight"].shape
        config.max_position_embeddings = state[embeddings + "position_embeddings.weight"].shape[0]
        config.type_vocab_size = state[embeddings + "token_type_embeddings.weight"].shape[0]
        config.pad_token_id, config.bos_token_id, config.eos_token_id = 1, 0, 2
        self.encoder = RobertaModel(config)
        self.dropout = nn.Dropout(0.1)
        self.classifier = nn.Linear(config.hidden_size, config.num_labels)
        self.id2label = {int(k): v for k, v in config.id2label.items()}
        missing, unexpected = self.load_state_dict(state, strict=False)
        # position_ids is a derived buffer in some transformers versions.
        real_missing = [k for k in missing if not k.endswith("position_ids")]
        if real_missing or unexpected:
            raise RuntimeError(f"Unexpected weights: missing={real_missing} unexpected={unexpected}")

    def forward(self, input_ids, attention_mask):
        pooled = self.encoder(input_ids=input_ids, attention_mask=attention_mask).pooler_output
        return self.classifier(self.dropout(pooled))


@dataclass
class Prediction:
    label: str
    scores: dict[str, float]


def segment(text: str) -> str:
    """PhoBERT expects word-segmented text ("sinh_viên"); pyvi does this without Java."""
    return ViTokenizer.tokenize(re.sub(r"\s+", " ", text).strip())


class ReviewClassifier:
    def __init__(self) -> None:
        torch.set_num_threads(max(1, min(4, torch.get_num_threads())))
        self._tox_tokenizer = AutoTokenizer.from_pretrained(MODELS_DIR / "toxicity")
        self._tox_model = PooledClassifier(MODELS_DIR / "toxicity").eval()
        self._sent_tokenizer = AutoTokenizer.from_pretrained(MODELS_DIR / "sentiment")
        self._sent_model = AutoModelForSequenceClassification.from_pretrained(
            MODELS_DIR / "sentiment"
        ).eval()

    @torch.inference_mode()
    def _probabilities(self, tokenizer, model, texts: list[str], is_pooled: bool) -> torch.Tensor:
        batch = tokenizer(
            texts, padding=True, truncation=True, max_length=MAX_LENGTH, return_tensors="pt"
        )
        if is_pooled:
            logits = model(batch["input_ids"], batch["attention_mask"])
        else:
            logits = model(**batch).logits
        return torch.softmax(logits, dim=-1)

    def classify(self, texts: list[str]) -> list[dict]:
        prepared = [segment(text) for text in texts]
        tox = self._probabilities(self._tox_tokenizer, self._tox_model, prepared, True)
        sent = self._probabilities(self._sent_tokenizer, self._sent_model, prepared, False)
        sent_labels = self._sent_model.config.id2label
        results = []
        for i in range(len(texts)):
            tox_scores = {
                self._tox_model.id2label[j]: round(float(tox[i][j]), 4) for j in range(tox.shape[1])
            }
            sent_scores = {
                SENTIMENT_LABELS[sent_labels[j]]: round(float(sent[i][j]), 4)
                for j in range(sent.shape[1])
            }
            results.append(
                {
                    "toxicity": {
                        "label": max(tox_scores, key=tox_scores.get),
                        "scores": tox_scores,
                        "toxic": round(1 - tox_scores["CLEAN"], 4),
                    },
                    "sentiment": {
                        "label": max(sent_scores, key=sent_scores.get),
                        "scores": sent_scores,
                        "confidence": max(sent_scores.values()),
                    },
                }
            )
        return results
