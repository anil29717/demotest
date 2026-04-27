# AR Buildwel ML Service
Python FastAPI service for AI matching,
valuation, and fraud detection.

## Setup
pip install -r requirements.txt

Run **from repo root** (recommended):

npm run dev:ml

Or **from repo root** without npm (loads `apps.ml.main` — works from any cwd if you stay on `PYTHONPATH`):

python -m uvicorn apps.ml.main:app --reload --port 8001

Or from **this folder** (`apps/ml`):

uvicorn main:app --reload --port 8001

Avoid `uvicorn main:app` **from the monorepo root** unless you pass `--app-dir apps/ml`; otherwise Python cannot find module `main`.

## Endpoints (Phase 2)
POST /match/score — AI match scoring
POST /valuation/institution — Institution valuation
POST /fraud/analyze — Behavioral fraud analysis
