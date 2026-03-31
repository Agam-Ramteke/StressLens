"""
predict.py
==========
Called by the Flask/FastAPI backend. Given a user's daily inputs,
returns predictions + SHAP contributions + auto-generated recommendations.

Usage (standalone test):
    python predict.py

Or import:
    from predict import predict_and_explain
"""

import json
import joblib
import numpy as np

FEATURES = [
    "age",
    "daily_screen_time_hours",
    "phone_usage_before_sleep_minutes",
    "sleep_duration_hours",
    "caffeine_intake_cups",
    "physical_activity_minutes",
    "notifications_received_per_day",
    "mental_fatigue_score",
    "gender_enc",       # 0=Female,1=Male (from LabelEncoder in training)
    "occupation_enc",   # integer-encoded occupation
]

# Hard-coded medical thresholds (override ML when needed)
CAFFEINE_WARNING_THRESHOLD = 4   # cups/day
SCREEN_TIME_WARNING         = 8  # hours/day
SLEEP_MIN_HOURS             = 6  # hours/night
ACTIVITY_MIN_MINUTES        = 20 # minutes/day

# Load models once at import
try:
    _stress_model = joblib.load("stress_model.pkl")
    _sleep_model  = joblib.load("sleep_model.pkl")
    _models_loaded = True
except FileNotFoundError:
    _models_loaded = False
    print("[WARN] Models not found. Run train_model.py first.")

try:
    import shap as _shap
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False


def _build_feature_vector(user_input: dict) -> np.ndarray:
    """Convert raw user dict → numpy array in correct order."""
    vec = [user_input.get(f, 0) for f in FEATURES]
    return np.array(vec, dtype=float).reshape(1, -1)


def _compute_shap_contributions(X: np.ndarray, model, label: str):
    """
    Returns per-feature SHAP contribution dict.
    Falls back to permutation-based approximation if SHAP not installed.
    """
    if _SHAP_AVAILABLE:
        explainer = _shap.TreeExplainer(model)
        vals = explainer.shap_values(X)[0]   # shape: (n_features,)
        return dict(zip(FEATURES, vals.tolist()))
    else:
        # Approx: feature_importance × (value − mean) as a rough proxy
        # NOT true SHAP — instruct user to install shap for real values
        importances = model.feature_importances_
        baseline    = model.predict(np.zeros_like(X))[0]
        pred        = model.predict(X)[0]
        scale       = (pred - baseline) if (pred - baseline) != 0 else 1.0
        raw         = importances * X[0]
        # normalise so they sum to pred - baseline
        total = raw.sum() if raw.sum() != 0 else 1.0
        contributions = raw / total * scale
        return dict(zip(FEATURES, contributions.tolist()))


def _generate_recommendations(shap_stress: dict, shap_sleep: dict,
                               user_input: dict, stress_pred: float,
                               sleep_pred: float) -> list[str]:
    """
    Read SHAP values and hard-coded thresholds,
    return ranked list of natural-language recommendations.
    """
    recs = []

    # ── ML-driven recommendations ────────────────────────────────────────────
    # Sort features by their absolute SHAP impact on STRESS (descending)
    top_stress_drivers = sorted(shap_stress.items(), key=lambda x: abs(x[1]), reverse=True)

    rec_map = {
        "daily_screen_time_hours": (
            "📵 Cut your screen time — it's the #1 driver of your stress score.",
            "📵 Your screen time is your biggest sleep disruptor. Set a daily limit."
        ),
        "phone_usage_before_sleep_minutes": (
            "🌙 Stop using your phone before bed. Bedtime screen use is spiking your stress.",
            "🌙 Put your phone away at least 60 min before sleep — it's directly hurting your sleep quality."
        ),
        "mental_fatigue_score": (
            "🧠 Your mental fatigue is high. Prioritise rest days and mindfulness.",
            "🧠 High mental fatigue is dragging your sleep quality down. Try a digital detox evening."
        ),
        "sleep_duration_hours": (
            "😴 You're sleeping too little. Aim for 7–9 hours — more sleep will directly reduce stress.",
            "😴 Longer sleep is the fastest lever to improve your sleep quality score."
        ),
        "physical_activity_minutes": (
            "🏃 More exercise will help regulate your stress hormones. Even 20 min walks count.",
            "🏃 Regular physical activity significantly improves sleep quality. Aim for 30+ min/day."
        ),
        "notifications_received_per_day": (
            "🔕 High notification volume is contributing to your stress. Use Do Not Disturb more.",
            "🔕 Constant pings are fragmenting your attention and sleep. Batch notifications."
        ),
        "caffeine_intake_cups": (
            "☕ Caffeine is a minor contributor to your stress based on the model.",
            "☕ Caffeine is not a primary issue for your sleep right now."
        ),
    }

    shown = set()
    for feat, shap_val in top_stress_drivers[:4]:
        if feat in rec_map and abs(shap_val) > 0.05 and feat not in shown:
            # index 0 = stress rec, index 1 = sleep rec
            recs.append(rec_map[feat][0] if stress_pred >= 6 else rec_map[feat][1])
            shown.add(feat)

    # ── Hard-coded medical threshold overrides ───────────────────────────────
    caffeine = user_input.get("caffeine_intake_cups", 0)
    if caffeine > CAFFEINE_WARNING_THRESHOLD and "caffeine_intake_cups" not in shown:
        recs.append(
            f"⚠️ Medical threshold alert: You're having {caffeine:.0f} cups of caffeine/day. "
            "Even if the ML model doesn't flag it strongly, >4 cups is a clinically recognised "
            "risk factor for anxiety, poor sleep, and elevated cortisol. Consider cutting back."
        )

    if user_input.get("sleep_duration_hours", 8) < SLEEP_MIN_HOURS:
        recs.append(
            "⚠️ You're getting fewer than 6 hours of sleep — this is a medical concern "
            "independent of your stress score. Chronic sleep deprivation has serious health risks."
        )

    if user_input.get("physical_activity_minutes", 0) < ACTIVITY_MIN_MINUTES:
        if "physical_activity_minutes" not in shown:
            recs.append("🏃 You're below the recommended 20 min of daily activity. Even light walking helps.")

    # ── Positive reinforcement ───────────────────────────────────────────────
    if stress_pred < 4 and sleep_pred > 7:
        recs = ["✅ Great work — your stress and sleep scores both look healthy! Keep it up."] + recs

    return recs[:5]  # cap at 5 recommendations


def predict_and_explain(user_input: dict) -> dict:
    """
    Main entry point.
    user_input keys: see FEATURES list above (use raw values — encoding handled here).

    Returns:
    {
        stress_pred: float,
        sleep_pred: float,
        shap_stress: {feature: value, ...},
        shap_sleep: {feature: value, ...},
        recommendations: [str, ...],
        shap_available: bool,
    }
    """
    if not _models_loaded:
        raise RuntimeError("Models not loaded. Run train_model.py first.")

    X = _build_feature_vector(user_input)
    stress_pred = float(_stress_model.predict(X)[0])
    sleep_pred  = float(_sleep_model.predict(X)[0])

    shap_stress = _compute_shap_contributions(X, _stress_model, "stress")
    shap_sleep  = _compute_shap_contributions(X, _sleep_model,  "sleep")

    recs = _generate_recommendations(
        shap_stress, shap_sleep, user_input, stress_pred, sleep_pred
    )

    return {
        "stress_pred":   round(stress_pred, 2),
        "sleep_pred":    round(sleep_pred, 2),
        "shap_stress":   {k: round(v, 3) for k, v in shap_stress.items()},
        "shap_sleep":    {k: round(v, 3) for k, v in shap_sleep.items()},
        "recommendations": recs,
        "shap_available": _SHAP_AVAILABLE,
    }


# ── Quick smoke test ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample_user = {
        "age": 28,
        "daily_screen_time_hours": 9.5,          # very high
        "phone_usage_before_sleep_minutes": 90,  # very high
        "sleep_duration_hours": 5.5,             # low
        "caffeine_intake_cups": 5,               # above threshold
        "physical_activity_minutes": 10,         # low
        "notifications_received_per_day": 200,
        "mental_fatigue_score": 8.0,
        "gender_enc": 1,       # Male
        "occupation_enc": 3,   # depends on LabelEncoder order from training
    }

    result = predict_and_explain(sample_user)
    print(json.dumps(result, indent=2))
