"""
predict_router.py  (fixed)
==========================
Fix: uses the singleton PredictService instance from main.py via dependency injection
instead of constructing a new one (which would load models twice).
"""

from fastapi import APIRouter, HTTPException, Depends
from app.models.predict_models import DailyMetricsInput, PredictionResponse
from app.services.predict_service import PredictService

router = APIRouter(prefix="/predict", tags=["predictions"])


def get_predict_service() -> PredictService:
    """Dependency — returns the singleton loaded in main.py lifespan."""
    from app.main import _predict_service
    return _predict_service


@router.post("/", response_model=PredictionResponse)
async def generate_prediction(
    metrics: DailyMetricsInput,
    service: PredictService = Depends(get_predict_service),
):
    """
    Accepts daily wellness metrics and returns:
      - stress_level (1–10)
      - sleep_quality_score (1–10)
      - stress_explanations  (SHAP per-feature contributions)
      - sleep_explanations
      - recommendation (natural language, driven by top SHAP drivers)
    """
    result = await service.get_prediction(metrics)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@router.get("/fields")
async def list_fields():
    """Returns the expected input fields and their types — useful for the mobile form."""
    return {
        "required_fields": {
            "age":                               "integer (18–70)",
            "daily_screen_time_hours":           "float (0–16)",
            "phone_usage_before_sleep_minutes":  "integer (0–180)",
            "sleep_duration_hours":              "float (3–12)",
            "caffeine_intake_cups":              "integer (0–10)",
            "physical_activity_minutes":         "integer (0–120)",
            "notifications_received_per_day":    "integer (0–500)",
            "mental_fatigue_score":              "float (1–10)",
        },
        "optional_fields": {
            "gender":     "string ('Male' | 'Female' | 'Other') — default: Male",
            "occupation": "string — use /predict/occupations for valid values",
        },
    }
