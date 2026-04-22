# StressLens Desktop Web App

This is the current desktop-first frontend for StressLens. It is a dependency-free HTML/CSS/JavaScript app that calls the FastAPI backend.

## Run

Start the backend first:

```bash
cd ../backend
python scripts/train_models.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Serve the frontend from this folder:

```bash
cd ../frontend
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Backend Contract

The app calls:

- `GET /health`
- `POST /predict`

The backend URL defaults to:

```text
http://localhost:8000
```
