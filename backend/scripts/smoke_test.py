import sys
from pathlib import Path

from fastapi.testclient import TestClient


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


SAMPLE_PAYLOAD = {
    "age": 28,
    "gender": "Male",
    "occupation": "Software Engineer",
    "daily_screen_time_hours": 7.5,
    "phone_usage_before_sleep_minutes": 75,
    "sleep_duration_hours": 6.2,
    "caffeine_intake_cups": 3,
    "physical_activity_minutes": 25,
    "notifications_received_per_day": 180,
    "mental_fatigue_score": 7,
}


def main() -> None:
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200, health.text
    assert health.json()["model_loaded"] is True, health.text

    prediction = client.post("/predict", json=SAMPLE_PAYLOAD)
    assert prediction.status_code == 200, prediction.text
    body = prediction.json()
    assert 1 <= body["stress_level"] <= 10, body
    assert 1 <= body["sleep_quality_score"] <= 10, body
    assert body["stress_explanations"], body
    assert body["recommendations"], body

    print("Backend smoke test passed")
    print({"stress": body["stress_level"], "sleep": body["sleep_quality_score"]})


if __name__ == "__main__":
    main()
