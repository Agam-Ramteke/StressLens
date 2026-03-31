from pydantic import BaseModel
from typing import List, Optional

class DailyMetricsInput(BaseModel):
    age: int
    daily_screen_time_hours: float
    phone_usage_before_sleep_minutes: int
    sleep_duration_hours: float
    caffeine_intake_cups: int
    physical_activity_minutes: int
    notifications_received_per_day: int
    mental_fatigue_score: float
    gender: str = "Male"
    occupation: str = "Worker"

class FeatureContribution(BaseModel):
    feature_name: str
    contribution: float
    value: float

class PredictionResponse(BaseModel):
    stress_level: float
    sleep_quality_score: float
    stress_explanations: List[FeatureContribution]
    sleep_explanations: List[FeatureContribution]
    recommendation: str
    base_stress_score: float
    base_sleep_score: float
