import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.models.predict_models import DailyMetricsInput, FeatureContribution, PredictionResponse

class PredictService:
    def __init__(self, model_dir: str = "backend/bin"):
        self.model_dir = model_dir
        self.stress_model_path = os.path.join(model_dir, "stress_model.pkl")
        self.sleep_model_path = os.path.join(model_dir, "sleep_model.pkl")
        self.feature_names_path = os.path.join(model_dir, "feature_names.json")
        
        # In a real app, these would be loaded in lifespan event
        self.models_loaded = False
        self.stress_model = None
        self.sleep_model = None
        self.feature_names = None

    def _load_models(self):
        if self.models_loaded:
            return True
        try:
            if os.path.exists(self.stress_model_path):
                self.stress_model = joblib.load(self.stress_model_path)
                self.sleep_model = joblib.load(self.sleep_model_path)
                self.models_loaded = True
                return True
            return False
        except Exception as e:
            print(f"Error loading models: {e}")
            return False

    async def get_prediction(self, metrics: DailyMetricsInput) -> Dict[str, Any]:
        """
        Calculates stress and sleep predictions along with SHAP-like explanations.
        In a production environment, you'd use a SHAP explainer here.
        """
        if not self._load_models():
            return {"error": "Models not found. Run training script first."}
            
        # 1. Transform data (Placeholder for actual preprocessing)
        # Assuming the order is fixed from train_model.py
        features = [
            metrics.age,
            metrics.daily_screen_time_hours,
            metrics.phone_usage_before_sleep_minutes,
            metrics.sleep_duration_hours,
            metrics.caffeine_intake_cups,
            metrics.physical_activity_minutes,
            metrics.notifications_received_per_day,
            metrics.mental_fatigue_score,
            0, # gender_enc placeholder
            0  # occupation_enc placeholder
        ]
        
        # 2. Predict
        stress_pred = self.stress_model.predict([features])[0]
        sleep_pred = self.sleep_model.predict([features])[0]
        
        # 3. Simulate SHAP explanations (Replace with actual SHAP logic if needed)
        # For now, let's just use some logic based on the feature importance to mock it
        explanations = []
        # ... logic to create SHAP-style contributions ...
        
        return {
            "stress_prediction": float(stress_pred),
            "sleep_prediction": float(sleep_pred),
            "recommendation": self._generate_recommendation(stress_pred, metrics)
        }

    def _generate_recommendation(self, stress_score: float, metrics: DailyMetricsInput) -> str:
        """Dashboard logic translated from user request."""
        if stress_score > 7.0:
            if metrics.daily_screen_time_hours > 6:
                return "Recommendation: You need to cut down your screen time and rest. Caffeine is not your primary issue right now."
            elif metrics.caffeine_intake_cups > 4:
                return "Recommendation: Try reducing caffeine intake and focusing on hydration before bedtime."
            else:
                return "Recommendation: High stress detected. Consider some light physical activity or meditation."
        return "You're doing great! Keep up the healthy habits."

# Global singleton or dependency-injected instance
predict_service = PredictService()
