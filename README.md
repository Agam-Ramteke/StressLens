# StressLens

StressLens predicts daily stress and sleep quality from behavior metrics, then explains the most important drivers behind each score. The project has been rebuilt around the preserved dataset at `backend/data/sleep_mobile_stress_dataset_15000.csv`.

## What Is Included

- `backend/` - FastAPI service, model loader, validated schemas, and training scripts.
- `backend/data/` - the preserved CSV dataset.
- `mobile/` - Expo React Native app for entering habits and reading predictions.
- `backend/artifacts/` - generated locally by training and ignored by git.

## Backend

Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Train the models from the preserved dataset:

```bash
python scripts/train_models.py
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Endpoints:

- `GET /health`
- `GET /meta`
- `POST /predict`

## Mobile App

Install dependencies:

```bash
cd mobile
npm install
```

Run the app:

```bash
npm run start
```

Useful launch commands:

```bash
npm run android
npm run ios
npm run web
```

Default backend URLs:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator and web: `http://localhost:8000`
- Physical device: use your computer's LAN address in the app, for example `http://192.168.1.20:8000`

## Verification

Backend smoke test:

```bash
cd backend
python scripts/smoke_test.py
```

Mobile typecheck:

```bash
cd mobile
npm run typecheck
```

## Input Metrics

The API accepts:

- age
- gender
- occupation
- daily screen time
- phone use before sleep
- sleep duration
- caffeine intake
- physical activity
- notifications received per day
- mental fatigue score
