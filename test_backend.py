"""
test_backend.py
===============
Validates the full pipeline without needing curl or Postman.
Run AFTER starting uvicorn in a separate terminal.

Usage:
    # Terminal 1 — start backend
    cd backend
    uvicorn app.main:app --reload

    # Terminal 2 — run this test
    python test_backend.py
"""

import json
import sys

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx", "--break-system-packages", "-q"])
    import httpx

BASE = "http://localhost:8000"

SAMPLE_USER = {
    "age": 28,
    "daily_screen_time_hours": 9.5,
    "phone_usage_before_sleep_minutes": 90,
    "sleep_duration_hours": 5.5,
    "caffeine_intake_cups": 5,
    "physical_activity_minutes": 10,
    "notifications_received_per_day": 200,
    "mental_fatigue_score": 8.0,
    "gender": "Male",
    "occupation": "Software Engineer",
}

HEALTHY_USER = {
    "age": 32,
    "daily_screen_time_hours": 3.0,
    "phone_usage_before_sleep_minutes": 10,
    "sleep_duration_hours": 8.0,
    "caffeine_intake_cups": 1,
    "physical_activity_minutes": 45,
    "notifications_received_per_day": 50,
    "mental_fatigue_score": 2.0,
    "gender": "Female",
    "occupation": "Teacher",
}

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"

def check(condition: bool, label: str, detail: str = ""):
    status = PASS if condition else FAIL
    print(f"  {status}  {label}")
    if not condition and detail:
        print(f"       → {detail}")
    return condition

def run_tests():
    all_passed = True

    print("\n─── 1. GET /  (root) ───────────────────────────────")
    try:
        r = httpx.get(f"{BASE}/")
        ok = check(r.status_code == 200, "Status 200")
        ok &= check("message" in r.json(), "Returns message field")
        all_passed &= ok
    except Exception as e:
        print(f"  {FAIL}  Could not connect: {e}")
        print("       Is uvicorn running?  →  cd backend && uvicorn app.main:app --reload")
        sys.exit(1)

    print("\n─── 2. GET /health ─────────────────────────────────")
    r = httpx.get(f"{BASE}/health")
    ok  = check(r.status_code == 200, "Status 200")
    data = r.json()
    ok &= check("model_loaded" in data, "Has model_loaded field")
    ok &= check(data.get("model_loaded") is True, "model_loaded == true",
                "Run python research/training/train_model.py first")
    all_passed &= ok

    print("\n─── 3. GET /api/v1/predict/fields ──────────────────")
    r = httpx.get(f"{BASE}/api/v1/predict/fields")
    ok = check(r.status_code == 200, "Status 200")
    ok &= check("required_fields" in r.json(), "Has required_fields")
    all_passed &= ok

    print("\n─── 4. POST /api/v1/predict/  (high-stress user) ───")
    r = httpx.post(f"{BASE}/api/v1/predict/", json=SAMPLE_USER, timeout=30)
    ok = check(r.status_code == 200, f"Status 200 (got {r.status_code})",
               r.text[:200] if r.status_code != 200 else "")
    if ok:
        data = r.json()
        ok &= check("stress_level"         in data, "Has stress_level")
        ok &= check("sleep_quality_score"  in data, "Has sleep_quality_score")
        ok &= check("stress_explanations"  in data, "Has stress_explanations")
        ok &= check("sleep_explanations"   in data, "Has sleep_explanations")
        ok &= check("recommendation"       in data, "Has recommendation")
        ok &= check(isinstance(data.get("stress_explanations"), list) and len(data["stress_explanations"]) > 0,
                    "stress_explanations is non-empty list")
        ok &= check(1 <= data.get("stress_level", 0) <= 10, "stress_level in range [1, 10]",
                    f"Got {data.get('stress_level')}")
        ok &= check(len(data.get("recommendation", "")) > 10, "Recommendation is non-empty")

        print(f"\n  Prediction for high-stress user:")
        print(f"    stress_level:       {data.get('stress_level')}")
        print(f"    sleep_quality:      {data.get('sleep_quality_score')}")
        print(f"    recommendation:     {data.get('recommendation')[:80]}…")
        top3 = sorted(data["stress_explanations"], key=lambda x: abs(x["contribution"]), reverse=True)[:3]
        print(f"    top SHAP drivers:   {', '.join(x['feature_name'] for x in top3)}")
    all_passed &= ok

    print("\n─── 5. POST /api/v1/predict/  (healthy user) ───────")
    r = httpx.post(f"{BASE}/api/v1/predict/", json=HEALTHY_USER, timeout=30)
    ok = check(r.status_code == 200, "Status 200")
    if ok:
        data = r.json()
        ok &= check(data.get("stress_level", 10) < data.get("sleep_quality_score", 0),
                    "Healthy user: sleep quality > stress (expected pattern)")
        print(f"\n  Prediction for healthy user:")
        print(f"    stress_level:       {data.get('stress_level')}")
        print(f"    sleep_quality:      {data.get('sleep_quality_score')}")
    all_passed &= ok

    print("\n─── 6. Validation — bad request ────────────────────")
    r = httpx.post(f"{BASE}/api/v1/predict/", json={"age": "not_a_number"})
    ok = check(r.status_code == 422, f"Returns 422 for invalid input (got {r.status_code})")
    all_passed &= ok

    print("\n" + ("═" * 50))
    if all_passed:
        print(f"  {PASS}  All tests passed. Backend is ready.")
    else:
        print(f"  {FAIL}  Some tests failed. See details above.")
    print("═" * 50 + "\n")
    return all_passed

if __name__ == "__main__":
    sys.exit(0 if run_tests() else 1)
