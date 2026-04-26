from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ValuationRequest(BaseModel):
    institution_id: str
    enrollment: Optional[int] = None
    ebitda_cr: Optional[float] = None
    campus_sqft: Optional[int] = None
    city_tier: Optional[int] = 2
    board: Optional[str] = None
    established_year: Optional[int] = None

class ValuationResponse(BaseModel):
    min_value_cr: float
    max_value_cr: float
    recommended_cr: float
    ebitda_multiple: float
    confidence: float
    methodology: str

@router.post("/institution",
  response_model=ValuationResponse)
async def valuate_institution(req: ValuationRequest):
    # Phase 2: regression model here
    # For now: basic EBITDA multiple
    ebitda = req.ebitda_cr or 1.0
    multiple = 4.0  # typical school multiple
    recommended = ebitda * multiple
    return ValuationResponse(
        min_value_cr=recommended * 0.8,
        max_value_cr=recommended * 1.2,
        recommended_cr=recommended,
        ebitda_multiple=multiple,
        confidence=0.4,
        methodology="ebitda_multiple_basic"
    )
