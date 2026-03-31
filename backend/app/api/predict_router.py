from fastapi import APIRouter, HTTPException
from app.models.predict_models import DailyMetricsInput, PredictionResponse
from app.services.predict_service import PredictService

router = APIRouter(prefix="/predict")
predict_service = PredictService()

@router.post("/", response_model=None)
async def generate_prediction_and_explanation(metrics: DailyMetricsInput):
    """Generates a stress/sleep prediction and SHAP explanation."""
    prediction = await predict_service.get_prediction(metrics)
    if "error" in prediction:
        raise HTTPException(status_code=503, detail=prediction["error"])
    return prediction
