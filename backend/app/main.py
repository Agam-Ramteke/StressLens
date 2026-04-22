from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.model_service import DATASET_PATH, FEATURE_NAMES, ModelService
from app.schemas import DailyMetrics, HealthResponse, MetadataResponse, PredictionResponse


VERSION = "2.0.0"
model_service = ModelService()

app = FastAPI(title="StressLens API", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "StressLens API", "version": VERSION}


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if model_service.loaded else "needs_training",
        model_loaded=model_service.loaded,
        dataset_found=DATASET_PATH.exists(),
        version=VERSION,
    )


@app.get("/meta", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    metadata_payload = model_service.metadata or {}
    return MetadataResponse(
        fields={
            "age": {"type": "integer", "min": 18, "max": 70},
            "daily_screen_time_hours": {"type": "number", "min": 0, "max": 16},
            "phone_usage_before_sleep_minutes": {"type": "integer", "min": 0, "max": 180},
            "sleep_duration_hours": {"type": "number", "min": 3, "max": 12},
            "caffeine_intake_cups": {"type": "integer", "min": 0, "max": 10},
            "physical_activity_minutes": {"type": "integer", "min": 0, "max": 180},
            "notifications_received_per_day": {"type": "integer", "min": 0, "max": 500},
            "mental_fatigue_score": {"type": "number", "min": 1, "max": 10},
        },
        genders=metadata_payload.get("gender_classes", ["Female", "Male", "Other"]),
        occupations=metadata_payload.get(
            "occupation_classes",
            ["Designer", "Doctor", "Freelancer", "Manager", "Researcher", "Software Engineer", "Student", "Teacher"],
        ),
        feature_names=metadata_payload.get("feature_names", FEATURE_NAMES),
        model_metrics=metadata_payload.get("model_metrics"),
    )


@app.post("/predict", response_model=PredictionResponse)
def predict(metrics: DailyMetrics) -> PredictionResponse:
    try:
        return PredictionResponse(**model_service.predict(metrics))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
