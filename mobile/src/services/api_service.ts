import axios from 'axios';
import { Platform } from 'react-native';

// Web uses localhost, Android emulator uses 10.0.2.2 to reach the host machine.
// For a physical device, replace with your machine's LAN IP (run: ipconfig).
const API_HOST = Platform.OS === 'web' ? 'localhost' : '10.0.2.2';
const BASE_URL = `http://${API_HOST}:8000/api/v1`;

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
};

export const FEATURE_LABELS: Record<string, string> = {
  daily_screen_time_hours: 'Screen Time',
  phone_usage_before_sleep_minutes: 'Phone Before Bed',
  sleep_duration_hours: 'Sleep Duration',
  caffeine_intake_cups: 'Caffeine Intake',
  physical_activity_minutes: 'Exercise',
  notifications_received_per_day: 'Notifications',
  mental_fatigue_score: 'Mental Fatigue',
  age: 'Age',
  gender_enc: 'Gender',
  occupation_enc: 'Occupation',
};

export const PredictAPI = {
  getPrediction: async (metrics: DailyMetrics): Promise<PredictionResponse | null> => {
    try {
      const response = await axios.post<PredictionResponse>(`${BASE_URL}/predict/`, metrics, { timeout: 15000 });
      return response.data;
    } catch (error: any) {
      console.error('API Error:', error.response?.data || error.message);
      return null;
    }
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, { timeout: 5000 });
      return response.data?.model_loaded === true;
    } catch {
      return false;
    }
  },
};
