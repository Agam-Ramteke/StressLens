"""
train_model.py  (updated)
=========================
Trains Random Forest models for stress_level and sleep_quality_score.
Now also saves LabelEncoders so the backend can encode new user input
without re-fitting on training data.

Run from project root:
    pip install -r backend/requirements.txt
    python research/training/train_model.py

Outputs (all written to backend/bin/):
    stress_model.pkl
    sleep_model.pkl
    feature_names.json
    label_encoders.pkl   ← NEW: required by predict_service.py
    sample_shap.json     ← example SHAP output (if shap installed)
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_PATH   = os.path.join(PROJECT_ROOT, "backend", "data", "sleep_mobile_stress_dataset_15000.csv")
OUTPUT_DIR  = os.path.join(PROJECT_ROOT, "backend", "bin")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── 1. Load ──────────────────────────────────────────────────────────────────
print(f"Loading data from {DATA_PATH}…")
df = pd.read_csv(DATA_PATH)
print(f"  Rows: {len(df)}  Cols: {list(df.columns)}")

# ── 2. Encode categoricals + SAVE the encoders ───────────────────────────────
le_gender = LabelEncoder()
le_occ    = LabelEncoder()
df["gender_enc"]     = le_gender.fit_transform(df["gender"])
df["occupation_enc"] = le_occ.fit_transform(df["occupation"])

encoders = {
    "gender":     le_gender,
    "occupation": le_occ,
}
encoder_path = os.path.join(OUTPUT_DIR, "label_encoders.pkl")
joblib.dump(encoders, encoder_path)
print(f"  ✓ Encoders saved → {encoder_path}")
print(f"    gender classes:     {list(le_gender.classes_)}")
print(f"    occupation classes: {list(le_occ.classes_)}")

# ── 3. Feature matrix ────────────────────────────────────────────────────────
FEATURES = [
    "age",
    "daily_screen_time_hours",
    "phone_usage_before_sleep_minutes",
    "sleep_duration_hours",
    "caffeine_intake_cups",
    "physical_activity_minutes",
    "notifications_received_per_day",
    "mental_fatigue_score",
    "gender_enc",
    "occupation_enc",
]

X        = df[FEATURES].values
y_stress = df["stress_level"].values
y_sleep  = df["sleep_quality_score"].values

# ── 4. Train / test split ────────────────────────────────────────────────────
X_tr, X_te, ys_tr, ys_te, yq_tr, yq_te = train_test_split(
    X, y_stress, y_sleep, test_size=0.2, random_state=42
)

# ── 5. Train ─────────────────────────────────────────────────────────────────
rf_stress = RandomForestRegressor(n_estimators=300, max_depth=12,
                                   n_jobs=-1, random_state=42)
rf_sleep  = RandomForestRegressor(n_estimators=300, max_depth=12,
                                   n_jobs=-1, random_state=42)

print("\nTraining stress model…")
rf_stress.fit(X_tr, ys_tr)
print("Training sleep model…")
rf_sleep.fit(X_tr, yq_tr)

# ── 6. Evaluate ──────────────────────────────────────────────────────────────
for name, model, y_te in [
    ("Stress Level",   rf_stress, ys_te),
    ("Sleep Quality",  rf_sleep,  yq_te),
]:
    pred = model.predict(X_te)
    print(f"\n  {name}: MAE={mean_absolute_error(y_te, pred):.3f}  R²={r2_score(y_te, pred):.3f}")

# ── 7. SHAP explanations ─────────────────────────────────────────────────────
try:
    import shap

    print("\nComputing SHAP values for first test row (this can be slow on large sets)…")
    explainer_stress = shap.TreeExplainer(rf_stress)
    explainer_sleep  = shap.TreeExplainer(rf_sleep)

    sv_stress = explainer_stress.shap_values(X_te[:1])
    sv_sleep  = explainer_sleep.shap_values(X_te[:1])

    sample_out = {
        "features":       FEATURES,
        "feature_values": X_te[0].tolist(),
        "shap_stress":    sv_stress[0].tolist(),
        "shap_sleep":     sv_sleep[0].tolist(),
        "base_stress":    float(np.array(explainer_stress.expected_value).flatten()[0]),
        "base_sleep":     float(np.array(explainer_sleep.expected_value).flatten()[0]),
        "pred_stress":    float(rf_stress.predict(X_te[[0]])[0]),
        "pred_sleep":     float(rf_sleep.predict(X_te[[0]])[0]),
    }
    with open(os.path.join(OUTPUT_DIR, "sample_shap.json"), "w") as f:
        json.dump(sample_out, f, indent=2)
    print("  ✓ sample_shap.json saved.")

except ImportError:
    print("\n[INFO] SHAP not installed — skipping SHAP output.")
    print("  Install with: pip install shap")
    print("\n  Global feature importances (stress model):")
    for feat, imp in sorted(zip(FEATURES, rf_stress.feature_importances_),
                             key=lambda x: -x[1]):
        bar = "█" * int(imp * 40)
        print(f"  {feat:<42} {imp:.4f}  {bar}")

# ── 8. Save models + feature list ────────────────────────────────────────────
joblib.dump(rf_stress, os.path.join(OUTPUT_DIR, "stress_model.pkl"))
joblib.dump(rf_sleep,  os.path.join(OUTPUT_DIR, "sleep_model.pkl"))
with open(os.path.join(OUTPUT_DIR, "feature_names.json"), "w") as f:
    json.dump(FEATURES, f, indent=2)

print(f"\n✓ All artifacts saved to {OUTPUT_DIR}/")
print("  stress_model.pkl  sleep_model.pkl  feature_names.json  label_encoders.pkl")
