"""HTTP wrapper around the local review classifiers.

Run:  .venv/Scripts/python -m uvicorn app:app --host 127.0.0.1 --port 8001
The backend calls POST /classify and treats any failure as "classifier unavailable",
in which case moderation falls back to the language-model check.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel, Field

from classifier import ReviewClassifier

MAX_TEXTS = 32
MAX_CHARS = 4000


class ClassifyRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=MAX_TEXTS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.classifier = ReviewClassifier()
    yield


app = FastAPI(title="FlexTrip review classifier", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "models": ["phobert-v2-hsd", "phobert-base-vietnamese-sentiment"]}


@app.post("/classify")
def classify(request: ClassifyRequest) -> dict:
    texts = [text[:MAX_CHARS] for text in request.texts]
    return {"results": app.state.classifier.classify(texts)}
