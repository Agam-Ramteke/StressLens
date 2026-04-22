from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.schemas import DailyMetrics


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "data" / "sleep_mobile_stress_dataset_15000.csv"
ARTIFACT_DIR = ROOT_DIR / "artifacts"

NUMERIC_FIELDS = [
    "age",
    "daily_screen_time_hours",
    "phone_usage_before_sleep_minutes",
    "sleep_duration_hours",
    "caffeine_intake_cups",
    "physical_activity_minutes",
    "notifications_received_per_day",
    "mental_fatigue_score",
]

FEATURE_NAMES = [*NUMERIC_FIELDS, "gender_enc", "occupation_enc"]

FEATURE_LABELS = {
    "age": "Age",
    "daily_screen_time_hours": "Screen time",
    "phone_usage_before_sleep_minutes": "Phone before bed",
    "sleep_duration_hours": "Sleep duration",
    "caffeine_intake_cups": "Caffeine",
    "physical_activity_minutes": "Physical activity",
    "notifications_received_per_day": "Notifications",
    "mental_fatigue_score": "Mental fatigue",
    "gender_enc": "Gender",
    "occupation_enc": "Occupation",
}


@dataclass
class LoadedModels:
    stress_model: Any
    sleep_model: Any
    encoders: dict[str, Any]
    metadata: dict[str, Any]


class ModelService:
    def __init__(self, artifact_dir: Path = ARTIFACT_DIR):
        self.artifact_dir = artifact_dir
        self._loaded: LoadedModels | None = None
        self._load_error: str | None = None
        self.load()

    @property
    def loaded(self) -> bool:
        return self._loaded is not None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    @property
    def metadata(self) -> dict[str, Any] | None:
        return self._loaded.metadata if self._loaded else None

    def load(self) -> bool:
        try:
            self._loaded = LoadedModels(
                stress_model=joblib.load(self.artifact_dir / "stress_model.joblib"),
                sleep_model=joblib.load(self.artifact_dir / "sleep_model.joblib"),
                encoders=joblib.load(self.artifact_dir / "encoders.joblib"),
                metadata=json.loads((self.artifact_dir / "metadata.json").read_text()),
            )
            self._load_error = None
            return True
        except FileNotFoundError as exc:
            self._loaded = None
            self._load_error = f"Missing model artifact: {exc.filename}"
            return False
        except Exception as exc:
            self._loaded = None
            self._load_error = f"Could not load model artifacts: {exc}"
            return False

    def predict(self, metrics: DailyMetrics) -> dict[str, Any]:
        if self._loaded is None and not self.load():
            raise RuntimeError(self._load_error or "Model artifacts are not available.")

        assert self._loaded is not None
        x = self._feature_vector(metrics)
        baseline = pd.DataFrame([self._loaded.metadata["feature_means"]], columns=FEATURE_NAMES)

        stress = float(self._loaded.stress_model.predict(x)[0])
        sleep = float(self._loaded.sleep_model.predict(x)[0])
        base_stress = float(self._loaded.stress_model.predict(baseline)[0])
        base_sleep = float(self._loaded.sleep_model.predict(baseline)[0])

        stress_explanations = self._contributions(self._loaded.stress_model, x, baseline)
        sleep_explanations = self._contributions(self._loaded.sleep_model, x, baseline)

        return {
            "stress_level": round(stress, 2),
            "sleep_quality_score": round(sleep, 2),
            "stress_band": self._stress_band(stress),
            "sleep_band": self._sleep_band(sleep),
            "stress_explanations": stress_explanations,
            "sleep_explanations": sleep_explanations,
            "recommendations": self._recommend(metrics, stress, sleep, stress_explanations),
            "base_stress_score": round(base_stress, 2),
            "base_sleep_score": round(base_sleep, 2),
        }

    def _feature_vector(self, metrics: DailyMetrics) -> pd.DataFrame:
        assert self._loaded is not None
        gender_enc = self._loaded.encoders["gender"].transform([metrics.gender])[0]
        occupation_enc = self._loaded.encoders["occupation"].transform([metrics.occupation])[0]

        values = [
            metrics.age,
            metrics.daily_screen_time_hours,
            metrics.phone_usage_before_sleep_minutes,
            metrics.sleep_duration_hours,
            metrics.caffeine_intake_cups,
            metrics.physical_activity_minutes,
            metrics.notifications_received_per_day,
            metrics.mental_fatigue_score,
            gender_enc,
            occupation_enc,
        ]
        return pd.DataFrame([values], columns=FEATURE_NAMES, dtype=float)

    def _contributions(self, model: Any, x: pd.DataFrame, baseline: pd.DataFrame) -> list[dict[str, float | str]]:
        prediction = float(model.predict(x)[0])
        rows = []

        for index, feature in enumerate(FEATURE_NAMES):
            perturbed = x.copy()
            perturbed.iat[0, index] = baseline.iat[0, index]
            without_feature = float(model.predict(perturbed)[0])
            rows.append(
                {
                    "feature": feature,
                    "label": FEATURE_LABELS[feature],
                    "value": round(float(x.iat[0, index]), 3),
                    "contribution": round(prediction - without_feature, 4),
                }
            )

        return sorted(rows, key=lambda row: abs(float(row["contribution"])), reverse=True)

    def _recommend(
        self,
        metrics: DailyMetrics,
        stress: float,
        sleep: float,
        stress_explanations: list[dict[str, float | str]],
    ) -> list[str]:
        recommendations: list[str] = []
        top_features = [str(row["feature"]) for row in stress_explanations[:4]]

        if metrics.sleep_duration_hours < 6:
            recommendations.append("Protect a minimum six-hour sleep window before tuning smaller habits.")
        if metrics.caffeine_intake_cups > 4:
            recommendations.append("Reduce caffeine below five cups and avoid it late in the day.")
        if metrics.physical_activity_minutes < 20:
            recommendations.append("Add at least twenty minutes of light movement to lower stress load.")
        if "daily_screen_time_hours" in top_features or metrics.daily_screen_time_hours >= 8:
            recommendations.append("Set a screen-time cutoff for the highest-friction apps.")
        if "phone_usage_before_sleep_minutes" in top_features or metrics.phone_usage_before_sleep_minutes >= 60:
            recommendations.append("Move the phone away from bed for the final hour before sleep.")
        if "mental_fatigue_score" in top_features and metrics.mental_fatigue_score >= 7:
            recommendations.append("Schedule a low-input recovery block before adding more work.")
        if stress < 4 and sleep > 7:
            recommendations.insert(0, "Your stress and sleep profile looks steady. Keep the current rhythm.")

        return recommendations[:4] or ["Keep tracking for a few days so StressLens can compare patterns."]

    @staticmethod
    def _stress_band(value: float) -> str:
        if value >= 7:
            return "High"
        if value >= 4:
            return "Moderate"
        return "Low"

    @staticmethod
    def _sleep_band(value: float) -> str:
        if value >= 7:
            return "Good"
        if value >= 5:
            return "Fair"
        return "Poor"
