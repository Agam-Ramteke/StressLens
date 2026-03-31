# StressLens 🧠💤

Predictive Stress & Sleep Analytics with Explainable AI (XAI). StressLens uses Machine Learning (Random Forest) and SHAP to not only predict user wellness but also explain *why* scores are high or low, providing personalized recommendations.

## 🚀 Project Overview

- **Core Engine**: `research/training/train_model.py` - Trains models and computes per-sample feature contributions.
- **Backend (API)**: `backend/` - FastAPI powered service serving real-time predictions and explanations.
- **Mobile (Client)**: `mobile/` - React Native application for user interaction and visualization.
- **Explainable AI (XAI)**: Uses SHAP (SHapley Additive exPlanations) to identify contributing factors like excessive screen time or caffeine intake.

## 📁 Directory Structure

```
StressLens/
├── backend/                # Python API (FastAPI)
│   ├── app/                # Application code
│   │   ├── api/            # Route handlers (Stress/Sleep endpoints)
│   │   ├── core/           # App config and security
│   │   ├── models/         # Pydantic schemas for requests/responses
│   │   ├── services/       # ML inference and SHAP processing
│   │   └── main.py         # Entry point
│   ├── bin/                # Trained .pkl models
│   ├── data/               # Local datasets
│   └── requirements.txt
├── mobile/                 # React Native Application
│   ├── src/
│   │   ├── components/     # UI elements (Cards, Charts)
│   │   ├── screens/        # Prediction Dashboard, Input forms
│   │   ├── services/       # API integration
│   │   └── theme/          # Custom styling (Glassmorphism inspired)
│   └── assets/
├── research/               # ML Development & Research
│   ├── training/           # Training scripts and model experiments
│   └── notebooks/          # Exploratory Data Analysis & Dashboard sketches
└── README.md
```

## 🛠 Features

- **Personalized Predictions**: Real-time stress and sleep quality forecasting.
- **Transparent AI**: Visual breakdown of factors influencing each prediction (powered by SHAP).
- **Actionable Insights**: Recommendations generated based on feature importance.
- **Dynamic Mobile App**: Sleek, responsive interface for tracking daily metrics.

## 🚦 Getting Started

1.  **ML Setup**:
    ```bash
    cd research/training
    pip install -r ../../backend/requirements.txt
    python train_model.py
    ```
2.  **Run Backend**:
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    ```
3.  **Run Mobile**:
    ```bash
    cd mobile
    npm install
    # for ios or android
    npm start
    ```

---
*Created as part of the StressLens vision.*
