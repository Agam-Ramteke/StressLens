import { Platform } from 'react-native';

export type Gender = 'Female' | 'Male' | 'Other';

export type Occupation =
  | 'Designer'
  | 'Doctor'
  | 'Freelancer'
  | 'Manager'
  | 'Researcher'
  | 'Software Engineer'
  | 'Student'
  | 'Teacher';

export type Metrics = {
  age: number;
  gender: Gender;
  occupation: Occupation;
  daily_screen_time_hours: number;
  phone_usage_before_sleep_minutes: number;
  sleep_duration_hours: number;
  caffeine_intake_cups: number;
  physical_activity_minutes: number;
  notifications_received_per_day: number;
  mental_fatigue_score: number;
};

export type NumericMetric = {
  [Key in keyof Metrics]: Metrics[Key] extends number ? Key : never;
}[keyof Metrics];

export type Contribution = {
  feature: string;
  label: string;
  value: number;
  contribution: number;
};

export type Prediction = {
  stress_level: number;
  sleep_quality_score: number;
  stress_band: string;
  sleep_band: string;
  stress_explanations: Contribution[];
  sleep_explanations: Contribution[];
  recommendations: string[];
  base_stress_score: number;
  base_sleep_score: number;
};

export const genders: Gender[] = ['Female', 'Male', 'Other'];

export const occupations: Occupation[] = [
  'Designer',
  'Doctor',
  'Freelancer',
  'Manager',
  'Researcher',
  'Software Engineer',
  'Student',
  'Teacher',
];

export const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const cleanUrl = (url: string) => url.replace(/\/+$/, '');

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const detail = body?.detail ?? response.statusText;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return body as T;
}

export async function checkHealth(apiUrl: string): Promise<boolean> {
  const response = await fetch(`${cleanUrl(apiUrl)}/health`);
  const body = await readJson<{ model_loaded: boolean }>(response);
  return body.model_loaded;
}

export async function predict(apiUrl: string, metrics: Metrics): Promise<Prediction> {
  const response = await fetch(`${cleanUrl(apiUrl)}/predict`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metrics),
  });
  return readJson<Prediction>(response);
}
