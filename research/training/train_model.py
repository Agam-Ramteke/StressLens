"""
train_model.py
==============
Trains a Random Forest model to predict stress_level and sleep_quality_score.
Computes per-sample SHAP-like feature contributions using TreeExplainer logic
(sklearn's built-in tree_explain / manual approach since SHAP may not be installed).

Run:
    pip install scikit-learn xgboost shap pandas numpy joblib
    python train_model.py

Outputs:
    stress_model.pkl        - trained RF for stress_level
    sleep_model.pkl         - trained RF for sleep_quality_score
    feature_names.json      - ordered feature list
    sample_shap_stress.json - example SHAP output for row 0
"""

import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score

# ── 1. Load & clean ─────────────────────────────────────────────────────────
df = pd.read_csv("sleep_mobile_stress_dataset_15000.csv")

# Encode categoricals
le_gender = LabelEncoder()
le_occ    = LabelEncoder()
df["gender_enc"]     = le_gender.fit_transform(df["gender"])
df["occupation_enc"] = le_occ.fit_transform(df["occupation"])

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

X = df[FEATURES].values
y_stress = df["stress_level"].values
y_sleep  = df["sleep_quality_score"].values

# ── 2. Train / test split ────────────────────────────────────────────────────
X_tr, X_te, ys_tr, ys_te, yq_tr, yq_te = train_test_split(
    X, y_stress, y_sleep, test_size=0.2, random_state=42
)

# ── 3. Train models ──────────────────────────────────────────────────────────
rf_stress = RandomForestRegressor(n_estimators=300, max_depth=12,
                                   n_jobs=-1, random_state=42)
rf_sleep  = RandomForestRegressor(n_estimators=300, max_depth=12,
                                   n_jobs=-1, random_state=42)

print("Training stress model…")
rf_stress.fit(X_tr, ys_tr)
print("Training sleep model…")
rf_sleep.fit(X_tr, yq_tr)

# ── 4. Evaluate ──────────────────────────────────────────────────────────────
for name, model, y_te in [
    ("Stress",        rf_stress, ys_te),
    ("Sleep Quality", rf_sleep,  yq_te),
]:
    pred = model.predict(X_te)
    print(f"\n{name}: MAE={mean_absolute_error(y_te, pred):.3f}  R²={r2_score(y_te, pred):.3f}")

# ── 5. SHAP explanations ─────────────────────────────────────────────────────
try:
    import shap

    # Use Tree explainer (fastest, exact for RF)
    explainer_stress = shap.TreeExplainer(rf_stress)
    explainer_sleep  = shap.TreeExplainer(rf_sleep)

    # Compute for full test set (can take a minute)
    print("\nComputing SHAP values for test set…")
    shap_stress = explainer_stress.shap_values(X_te)   # shape: (n, n_features)
    shap_sleep  = explainer_sleep.shap_values(X_te)

    # Save summary for dashboard use
    shap_df_stress = pd.DataFrame(shap_stress, columns=FEATURES)
    shap_df_sleep  = pd.DataFrame(shap_sleep,  columns=FEATURES)

    shap_df_stress.to_csv("shap_stress_test.csv", index=False)
    shap_df_sleep.to_csv("shap_sleep_test.csv",   index=False)

    # Example for first test sample
    sample_out = {
        "features":      FEATURES,
        "feature_values": X_te[0].tolist(),
        "shap_stress":   shap_stress[0].tolist(),
        "shap_sleep":    shap_sleep[0].tolist(),
        "base_stress":   float(explainer_stress.expected_value),
        "base_sleep":    float(explainer_sleep.expected_value),
        "pred_stress":   float(rf_stress.predict(X_te[[0]])[0]),
        "pred_sleep":    float(rf_sleep.predict(X_te[[0]])[0]),
    }
    with open("sample_shap_stress.json", "w") as f:
        json.dump(sample_out, f, indent=2)
    print("✓ SHAP values saved.")

except ImportError:
    # Fall back to sklearn's built-in feature importances
    print("\n[INFO] SHAP not installed — using RF feature_importances_ instead.")
    print("Install with: pip install shap")
    print("Feature importances (global, not per-sample):")
    for feat, imp in sorted(zip(FEATURES, rf_stress.feature_importances_),
                             key=lambda x: -x[1]):
        print(f"  {feat:<40} {imp:.4f}")

# ── 6. Save models ───────────────────────────────────────────────────────────
joblib.dump(rf_stress, "stress_model.pkl")
joblib.dump(rf_sleep,  "sleep_model.pkl")
with open("feature_names.json", "w") as f:
    json.dump(FEATURES, f)
print("\n✓ Models saved: stress_model.pkl  sleep_model.pkl  feature_names.json")
