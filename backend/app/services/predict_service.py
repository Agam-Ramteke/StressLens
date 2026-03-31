"""
predict_service.py  (fixed)
===========================
Fixes:
  1. Loads label_encoders.pkl so gender/occupation can be encoded for new users
  2. Computes real SHAP contributions (or feature-importance approximation)
  3. Returns field names that match PredictionResponse exactly
  4. Adds /health data support
"""

import os
import json
import joblib
import numpy as np
from typing import Dict, Any, List

from app.models.predict_models import DailyMetricsInput, FeatureContribution

# Hard-coded medical thresholds (applied regardless of ML output)
CAFFEINE_THRESHOLD  = 4    # cups/day
SLEEP_MIN_HOURS     = 6    # hours/night
ACTIVITY_MIN_MINS   = 20   # minutes/day


class PredictService:
    def __init__(self, model_dir: str = None):
        if model_dir is None:
            # Resolve relative to this file so it works wherever uvicorn is launched from
            here      = os.path.dirname(os.path.abspath(__file__))
            model_dir = os.path.abspath(os.path.join(here, "..", "..", "bin"))

        self.model_dir = model_dir
        self._stress_model  = None
        self._sleep_model   = None
        self._encoders      = None
        self._feature_names = None
        self._models_loaded = False

        # Try eager load — fails silently if models not trained yet
        self._load_models()

    # ── Model loading ─────────────────────────────────────────────────────────
    def _load_models(self) -> bool:
        stress_path  = os.path.join(self.model_dir, "stress_model.pkl")
        sleep_path   = os.path.join(self.model_dir, "sleep_model.pkl")
        encoder_path = os.path.join(self.model_dir, "label_encoders.pkl")
        feat_path    = os.path.join(self.model_dir, "feature_names.json")

        if not os.path.exists(stress_path):
            return False
        try:
            self._stress_model  = joblib.load(stress_path)
            self._sleep_model   = joblib.load(sleep_path)
            self._encoders      = joblib.load(encoder_path)
            with open(feat_path) as f:
                self._feature_names = json.load(f)
            self._models_loaded = True
            return True
        except Exception as e:
            print(f"[PredictService] Error loading models: {e}")
            return False

    @property
    def models_loaded(self) -> bool:
        return self._models_loaded

    # ── Feature vector ────────────────────────────────────────────────────────
    def _build_feature_vector(self, metrics: DailyMetricsInput) -> np.ndarray:
        """Encode categorical fields and assemble in the same order as training."""
        try:
            gender_enc = int(self._encoders["gender"].transform([metrics.gender])[0])
        except ValueError:
            # Unseen label — default to 0
            gender_enc = 0

        try:
            occ_enc = int(self._encoders["occupation"].transform([metrics.occupation])[0])
        except ValueError:
            occ_enc = 0

        # Must match FEATURES order in train_model.py exactly
        vec = [
            metrics.age,
            metrics.daily_screen_time_hours,
            metrics.phone_usage_before_sleep_minutes,
            metrics.sleep_duration_hours,
            metrics.caffeine_intake_cups,
            metrics.physical_activity_minutes,
            metrics.notifications_received_per_day,
            metrics.mental_fatigue_score,
            gender_enc,
            occ_enc,
        ]
        return np.array(vec, dtype=float).reshape(1, -1)

    # ── SHAP contributions ────────────────────────────────────────────────────
    def _compute_shap(self, X: np.ndarray, model) -> np.ndarray:
        """
        Returns shape (n_features,) contribution array.
        Uses real SHAP TreeExplainer when available; falls back to a scaled
        feature-importance approximation otherwise.
        """
        try:
            import shap
            explainer = shap.TreeExplainer(model)
            return explainer.shap_values(X)[0]
        except ImportError:
            pass

        # Fallback: importance × normalised deviation from midpoint
        importances = model.feature_importances_
        pred        = model.predict(X)[0]
        baseline    = np.mean([t.predict(X)[0] for t in model.estimators_[:20]])
        scale       = (pred - baseline) if abs(pred - baseline) > 1e-6 else 1.0
        raw         = importances * X[0]
        total       = raw.sum() if abs(raw.sum()) > 1e-6 else 1.0
        return (raw / total) * scale

    # ── Recommendations ───────────────────────────────────────────────────────
    _REC_MAP = {
        "daily_screen_time_hours": (
            "Screen time is your #1 stress driver — set a daily limit.",
            "Screen time is your biggest sleep disruptor.",
        ),
        "phone_usage_before_sleep_minutes": (
            "Put your phone away 60 min before bed — bedtime use is spiking your stress.",
            "Bedtime phone use is directly hurting your sleep quality.",
        ),
        "mental_fatigue_score": (
            "Your mental fatigue is high. Prioritise rest and avoid overload.",
            "High mental fatigue is dragging your sleep quality down.",
        ),
        "sleep_duration_hours": (
            "You're sleeping too little. Aim for 7–9 hrs — it directly reduces stress.",
            "Getting more sleep is the fastest lever for your sleep score.",
        ),
        "physical_activity_minutes": (
            "More exercise regulates stress hormones. Even 20-min walks count.",
            "Regular physical activity significantly improves sleep quality.",
        ),
        "notifications_received_per_day": (
            "High notification volume is contributing to your stress. Use Do Not Disturb.",
            "Constant pings fragment attention and disrupt sleep.",
        ),
    }

    def _generate_recommendation(
        self,
        shap_stress: np.ndarray,
        metrics: DailyMetricsInput,
        stress_pred: float,
        sleep_pred: float,
    ) -> str:
        recs: list[str] = []

        # ML-driven: top SHAP drivers
        shap_dict = dict(zip(self._feature_names, shap_stress))
        top = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
        shown = set()
        for feat, val in top[:4]:
            if feat in self._REC_MAP and abs(val) > 0.05 and feat not in shown:
                idx = 0 if stress_pred >= 6 else 1
                recs.append(self._REC_MAP[feat][idx])
                shown.add(feat)

        # Hard-coded medical overrides
        if metrics.caffeine_intake_cups > CAFFEINE_THRESHOLD:
            recs.append(
                f"Medical alert: {metrics.caffeine_intake_cups} cups/day exceeds the "
                "recommended maximum. High caffeine is a clinically recognised risk factor "
                "for anxiety and poor sleep, even if the ML model doesn't flag it strongly."
            )
        if metrics.sleep_duration_hours < SLEEP_MIN_HOURS:
            recs.append(
                "Less than 6 hrs of sleep is a medical concern regardless of your score. "
                "Chronic sleep deprivation carries serious health risks."
            )
        if metrics.physical_activity_minutes < ACTIVITY_MIN_MINS and "physical_activity_minutes" not in shown:
            recs.append("Below 20 min of daily activity. Even light walking has measurable benefits.")

        if stress_pred < 4 and sleep_pred > 7:
            recs.insert(0, "Great work — your stress and sleep scores both look healthy! Keep it up.")

        return " | ".join(recs[:3]) if recs else "Keep monitoring your habits daily."

    # ── Main entry ────────────────────────────────────────────────────────────
    async def get_prediction(self, metrics: DailyMetricsInput) -> Dict[str, Any]:
        if not self._models_loaded and not self._load_models():
            return {"error": "Models not found. Run research/training/train_model.py first."}

        X = self._build_feature_vector(metrics)

        stress_pred = float(self._stress_model.predict(X)[0])
        sleep_pred  = float(self._sleep_model.predict(X)[0])

        shap_stress = self._compute_shap(X, self._stress_model)
        shap_sleep  = self._compute_shap(X, self._sleep_model)

        def to_contributions(shap_vals: np.ndarray, raw_vec: np.ndarray) -> List[dict]:
            return [
                {
                    "feature_name": feat,
                    "contribution": round(float(sv), 4),
                    "value":        round(float(rv), 4),
                }
                for feat, sv, rv in zip(self._feature_names, shap_vals, raw_vec[0])
            ]

        recommendation = self._generate_recommendation(shap_stress, metrics, stress_pred, sleep_pred)

        # Field names match PredictionResponse in predict_models.py exactly
        return {
            "stress_level":       round(stress_pred, 2),
            "sleep_quality_score": round(sleep_pred, 2),
            "stress_explanations": to_contributions(shap_stress, X),
            "sleep_explanations":  to_contributions(shap_sleep,  X),
            "recommendation":      recommendation,
            "base_stress_score":   round(float(np.mean([t.predict(X)[0] for t in self._stress_model.estimators_[:10]])), 2),
            "base_sleep_score":    round(float(np.mean([t.predict(X)[0] for t in self._sleep_model.estimators_[:10]])),  2),
        }
