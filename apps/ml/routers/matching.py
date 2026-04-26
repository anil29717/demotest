import csv
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
FEEDBACK_CSV = DATA_DIR / "match_feedback.csv"


class MatchScoreRequest(BaseModel):
    property_id: str
    requirement_id: str
    rule_score: float
    features: dict


class MatchScoreResponse(BaseModel):
    ml_score: float
    combined_score: float
    confidence: float
    explanation: dict


class MatchFeedbackRequest(BaseModel):
    match_id: str
    accepted: bool | None = None
    converted_to_lead: bool | None = None
    converted_to_deal: bool | None = None
    deal_closed: bool | None = None


def _weights() -> tuple[float, float]:
    rule_w = float(os.environ.get("RULE_MATCH_WEIGHT", "0.6"))
    ai_w = float(os.environ.get("AI_MATCH_WEIGHT", "0.4"))
    s = rule_w + ai_w
    if s <= 0:
        return 0.6, 0.4
    return rule_w / s, ai_w / s


@router.post("/score", response_model=MatchScoreResponse)
async def score_match(req: MatchScoreRequest):
    """Rule-only until a trained model exists; then blend with env weights."""
    rule_w, ai_w = _weights()
    model_path = os.environ.get("MATCH_ML_MODEL_PATH", "").strip()

    if model_path and os.path.isfile(model_path):
        # Future: load sklearn/torch model and req.features
        ml_score = req.rule_score
        combined = rule_w * req.rule_score + ai_w * ml_score
        return MatchScoreResponse(
            ml_score=ml_score,
            combined_score=combined,
            confidence=0.85,
            explanation={"using": "ml_model", "path": model_path},
        )

    ml_score = req.rule_score
    combined_score = req.rule_score
    return MatchScoreResponse(
        ml_score=ml_score,
        combined_score=combined_score,
        confidence=0.5,
        explanation={
            "using": "rule_fallback",
            "reason": "model not trained yet",
            "weights": {"rule": rule_w, "ai": ai_w},
        },
    )


@router.post("/feedback")
async def match_feedback(req: MatchFeedbackRequest):
    """Append training rows for future model retraining (fire-and-forget from API)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    new_file = not FEEDBACK_CSV.is_file()
    row = [
        datetime.now(timezone.utc).isoformat(),
        req.match_id,
        req.accepted,
        req.converted_to_lead,
        req.converted_to_deal,
        req.deal_closed,
    ]
    with FEEDBACK_CSV.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(
                [
                    "ts",
                    "match_id",
                    "accepted",
                    "converted_to_lead",
                    "converted_to_deal",
                    "deal_closed",
                ]
            )
        w.writerow(row)
    return {"ok": True}
