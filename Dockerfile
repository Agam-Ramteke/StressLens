# ─── StressLens — Single-container Deployment ───
# Serves both the FastAPI backend and static frontend from one process.
# Optimized for Render free tier (~512 MB RAM).

FROM python:3.11-slim AS base

# Security: run as non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# ── Install Python deps first (layer caching) ──
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy backend source ──
COPY backend/app ./app
COPY backend/data ./data

# ── Copy pre-trained model artifacts ──
# These must be present locally (not gitignored in Docker context).
# If missing, the app will start in "needs_training" mode.
COPY backend/artifacts ./artifacts

# ── Copy static frontend ──
COPY frontend ./static

# ── Security: drop to non-root ──
RUN chown -R appuser:appuser /app
USER appuser

# ── Expose port (Render injects $PORT, defaults to 10000) ──
EXPOSE 10000

# ── Health check for Render ──
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

# ── Start uvicorn ──
# Render sets $PORT; we default to 10000 if unset.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --log-level info"]
