import axios from 'axios';

// Replace with your local IP when testing on a real device!
const BASE_URL = 'http://localhost:8000/api/v1';

export type DailyMetrics = {
  age: number;
  daily_screen_time_hours: number;
  phone_usage_before_sleep_minutes: number;
  sleep_duration_hours: number;
  caffeine_intake_cups: number;
  physical_activity_minutes: number;
  notifications_received_per_day: number;
  mental_fatigue_score: number;
  gender: 'Male' | 'Female' | 'Other';
  occupation: string;
};

export type FeatureContribution = {
  feature_name: string;
  contribution: number;
  value: number;
};

export type PredictionResponse = {
  stress_level: number;
  sleep_quality_score: number;
  stress_explanations: FeatureContribution[];
  sleep_explanations: FeatureContribution[];
  recommendation: string;
  base_stress_score: number;
  base_sleep_score: number;
  error?: string;
};

export const PredictAPI = {
  getPrediction: async (metrics: DailyMetrics): Promise<PredictionResponse> => {
    try {
      const response = await axios.post(`${BASE_URL}/predict/`, metrics);
      return response.data;
    } catch (error: any) {
      console.error('API Error:', error.response?.data || error.message);
      return {
        stress_level: 0,
        sleep_quality_score: 0,
        stress_explanations: [],
        sleep_explanations: [],
        recommendation: '',
        base_stress_score: 0,
        base_sleep_score: 0,
        error: error.message || 'Failed to connect to the prediction engine.'
      };
    }
  },
};
