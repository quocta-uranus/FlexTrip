# Local Vietnamese review classifier

A small CPU service that runs two PhoBERT models. The backend asks it first about every review and only calls the Groq LLM for the ones it cannot settle (see `src/modules/reviews/review-cascade.ts`). The service is optional: without it, or if it is down, every review goes to the LLM as before.

| Model | Source (pinned revision) | Output | Licence |
|---|---|---|---|
| Toxicity | [visolex/phobert-v2-hsd](https://huggingface.co/visolex/phobert-v2-hsd) `221aca47` | CLEAN / OFFENSIVE / HATE | MIT |
| Sentiment | [wonrax/phobert-base-vietnamese-sentiment](https://huggingface.co/wonrax/phobert-base-vietnamese-sentiment) `9076a589` | NEG / POS / NEU | MIT |

About 1.1 GB of weights, ~1.2 GB of Python packages, 50-120 ms per review on CPU.

## Safety notes

- `download_models.py` fetches only weights and tokenizer files, never repository code. The toxicity repository ships its own `models.py`; it is never run. `classifier.py` rebuilds the same encoder + pooled output + linear layer from standard transformers classes.
- The sentiment checkpoint is a pickle (`pytorch_model.bin`). It is read once with `torch.load(weights_only=True)`, which accepts tensors only, converted to safetensors, and deleted.
- The service listens on `127.0.0.1` only and has no authentication. Do not expose it.

## Setup (Windows, from `be/ml/review-classifier`)

```bash
python -m venv .venv
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install -r requirements.txt
set PYTHONUTF8=1 && .venv/Scripts/python download_models.py
```

On Linux or macOS use `.venv/bin/python` and `PYTHONUTF8=1 .venv/bin/python download_models.py`. The CPU wheel index keeps the CUDA build (several GB) out.

## Run

```bash
.venv/Scripts/python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

Then set `REVIEW_CLASSIFIER_URL=http://127.0.0.1:8001` in `be/.env` and restart the backend. Check it with `GET /health`.

## How well it works

Measured on the 150-case evaluation set (`npm run eval:reviews -- --mode=full --cascade`, report in `evals/reviews/results/`). The thresholds are in the admin config page under "Kiểm duyệt AI".

The cue lists in `review-cascade.ts` were tuned against that same set, so the saving on unseen reviews can differ. The set is synthetic and over-represents violations, so real traffic should send fewer reviews to the LLM than the figure there.

Known weak spots of the models: the hate-speech model scores plain threats and offers near zero, and the sentiment model leans positive or negative on mild 3-star text. Both are handled by sending those reviews to the LLM.
