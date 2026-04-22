from typing import Literal

from pydantic import BaseModel, Field


Gender = Literal["Female", "Male", "Other"]
Occupation = Literal[
    "Designer",
    "Doctor",
    "Freelancer",
    "Manager",
    "Researcher",
    "Software Engineer",
    "Student",
    "Teacher",
]


class DailyMetrics(BaseModel):
    age: int = Field(ge=18, le=70)
    gender: Gender = "Male"
    occupation: Occupation = "Software Engineer"
    daily_screen_time_hours: float = Field(ge=0, le=16)
    phone_usage_before_sleep_minutes: int = Field(ge=0, le=180)
    sleep_duration_hours: float = Field(ge=3, le=12)
    caffeine_intake_cups: int = Field(ge=0, le=10)
    physical_activity_minutes: int = Field(ge=0, le=180)
    notifications_received_per_day: int = Field(ge=0, le=500)
    mental_fatigue_score: float = Field(ge=1, le=10)


class FeatureContribution(BaseModel):
    feature: str
    label: str
    value: float
    contribution: float


class PredictionResponse(BaseModel):
    stress_level: float
    sleep_quality_score: float
    stress_band: str
    sleep_band: str
    stress_explanations: list[FeatureContribution]
    sleep_explanations: list[FeatureContribution]
    recommendations: list[str]
    base_stress_score: float
    base_sleep_score: float


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    dataset_found: bool
    version: str


class MetadataResponse(BaseModel):
    fields: dict[str, dict[str, str | int | float]]
    genders: list[str]
    occupations: list[str]
    feature_names: list[str]
    model_metrics: dict[str, dict[str, float]] | None = None
