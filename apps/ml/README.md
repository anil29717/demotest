# AR Buildwel ML Service
Python FastAPI service for AI matching,
valuation, and fraud detection.

## Setup
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

## Endpoints (Phase 2)
POST /match/score — AI match scoring
POST /valuation/institution — Institution valuation
POST /fraud/analyze — Behavioral fraud analysis
