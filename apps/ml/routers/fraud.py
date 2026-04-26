from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class FraudAnalysisRequest(BaseModel):
    user_id: str
    listing_count_24h: int
    price_deviation_pct: Optional[float] = None
    geo_mismatch: bool = False
    image_hashes: List[str] = []

class FraudAnalysisResponse(BaseModel):
    risk_score: float  # 0-1
    risk_level: str    # LOW/MEDIUM/HIGH
    flags: List[str]
    recommended_action: str

@router.post("/analyze",
  response_model=FraudAnalysisResponse)
async def analyze_fraud(req: FraudAnalysisRequest):
    # Phase 2: ML behavioral model here
    # For now: rule-based scoring
    score = 0.0
    flags = []
    if req.listing_count_24h > 5:
        score += 0.4
        flags.append("high_velocity")
    if req.geo_mismatch:
        score += 0.3
        flags.append("geo_mismatch")
    if req.price_deviation_pct and \
       req.price_deviation_pct > 50:
        score += 0.2
        flags.append("price_outlier")
    level = "LOW" if score < 0.3 else \
            "MEDIUM" if score < 0.6 else "HIGH"
    return FraudAnalysisResponse(
        risk_score=score,
        risk_level=level,
        flags=flags,
        recommended_action="REVIEW" \
          if score > 0.5 else "ALLOW"
    )
