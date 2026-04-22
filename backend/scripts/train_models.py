from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


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
TARGETS = ["stress_level", "sleep_quality_score"]


def require_columns(df: pd.DataFrame) -> None:
    missing = [column for column in [*NUMERIC_FIELDS, "gender", "occupation", *TARGETS] if column not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")


def build_model() -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=180,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATASET_PATH)
    require_columns(df)

    encoders = {
        "gender": LabelEncoder().fit(df["gender"]),
        "occupation": LabelEncoder().fit(df["occupation"]),
    }
    df["gender_enc"] = encoders["gender"].transform(df["gender"])
    df["occupation_enc"] = encoders["occupation"].transform(df["occupation"])

    x = df[FEATURE_NAMES]
    stress_y = df["stress_level"]
    sleep_y = df["sleep_quality_score"]

    x_train, x_test, stress_train, stress_test, sleep_train, sleep_test = train_test_split(
        x,
        stress_y,
        sleep_y,
        test_size=0.2,
        random_state=42,
    )

    stress_model = build_model()
    sleep_model = build_model()
    stress_model.fit(x_train, stress_train)
    sleep_model.fit(x_train, sleep_train)

    stress_pred = stress_model.predict(x_test)
    sleep_pred = sleep_model.predict(x_test)

    model_metrics = {
        "stress": {
            "mae": round(float(mean_absolute_error(stress_test, stress_pred)), 4),
            "r2": round(float(r2_score(stress_test, stress_pred)), 4),
        },
        "sleep": {
            "mae": round(float(mean_absolute_error(sleep_test, sleep_pred)), 4),
            "r2": round(float(r2_score(sleep_test, sleep_pred)), 4),
        },
    }

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_rows": int(len(df)),
        "dataset_file": DATASET_PATH.name,
        "feature_names": FEATURE_NAMES,
        "feature_means": [float(value) for value in x.mean().tolist()],
        "gender_classes": encoders["gender"].classes_.tolist(),
        "occupation_classes": encoders["occupation"].classes_.tolist(),
        "model_metrics": model_metrics,
    }

    joblib.dump(stress_model, ARTIFACT_DIR / "stress_model.joblib")
    joblib.dump(sleep_model, ARTIFACT_DIR / "sleep_model.joblib")
    joblib.dump(encoders, ARTIFACT_DIR / "encoders.joblib")
    (ARTIFACT_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2))

    print("StressLens models trained")
    print(json.dumps(model_metrics, indent=2))
    print(f"Artifacts written to {ARTIFACT_DIR}")


if __name__ == "__main__":
    main()
