import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.model_service import DATASET_PATH, FEATURE_NAMES, ModelService
from app.schemas import DailyMetrics, HealthResponse, MetadataResponse, PredictionResponse


VERSION = "2.0.0"
model_service = ModelService()

app = FastAPI(
    title="StressLens API",
    version=VERSION,
    docs_url="/docs" if os.getenv("DEBUG") else None,       # hide Swagger in prod
    redoc_url="/redoc" if os.getenv("DEBUG") else None,
)

# ── CORS — accept all in dev, restrict in prod ──
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ── Security headers middleware ──
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ── API Routes ──
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


# ── Serve static frontend (must be LAST so API routes take priority) ──
_static_dir = Path(__file__).resolve().parents[1] / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
