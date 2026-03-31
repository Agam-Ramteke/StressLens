"""
main.py  (fixed)
================
Changes:
  - include_router() is now uncommented (was the root cause of 404s)
  - Added GET /health endpoint — mobile app polls this before showing predictions
  - Added startup lifespan event to pre-warm the model (avoids cold-start lag on first request)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.predict_router import router as predict_router
from app.services.predict_service import PredictService

# Pre-load models at startup (avoids cold-start on first prediction request)
_predict_service = PredictService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not _predict_service.models_loaded:
        print("[Startup] WARNING: Models not loaded. Run train_model.py first.")
    else:
        print("[Startup] Models loaded successfully.")
    yield
    # Shutdown (nothing to clean up for RF models)


app = FastAPI(
    title="StressLens API",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins in dev; lock this down in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "StressLens Prediction API v1.1.0"}


@app.get("/health")
async def health():
    """
    Mobile app polls this before showing the prediction UI.
    Returns model status so the app can show a friendly 'model loading' state.
    """
    return {
        "status":       "ok",
        "model_loaded": _predict_service.models_loaded,
        "version":      "1.1.0",
    }


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(predict_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
