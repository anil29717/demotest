from fastapi import FastAPI

try:
    from .routers import fraud, matching, valuation
except ImportError:
    # Running `uvicorn main:app` from `apps/ml` (not as package `apps.ml.main`).
    from routers import fraud, matching, valuation

app = FastAPI(
    title="AR Buildwel ML Service",
    version="0.1.0",
    description="Phase 2 AI intelligence layer"
)

app.include_router(
    matching.router, prefix="/match"
)
app.include_router(
    valuation.router, prefix="/valuation"
)
app.include_router(
    fraud.router, prefix="/fraud"
)

@app.get("/health")
def health():
    return {"status": "ok", "phase": 2}
