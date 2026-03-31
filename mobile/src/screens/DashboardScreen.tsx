import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, spacing, fonts, radius } from '../theme/tokens';
import { PredictAPI, PredictionResponse, DailyMetrics } from '../services/api_service';
import ScoreCards from '../components/ScoreCards';
import HabitSliders from '../components/HabitSliders';
import ShapBars from '../components/ShapBars';
import Recommendations from '../components/Recommendations';

const DEFAULT_METRICS: DailyMetrics = {
  age: 28,
  daily_screen_time_hours: 6,
  phone_usage_before_sleep_minutes: 60,
  sleep_duration_hours: 7,
  caffeine_intake_cups: 2,
  physical_activity_minutes: 30,
  notifications_received_per_day: 150,
  mental_fatigue_score: 5,
  gender: 'Male',
  occupation: 'Software Engineer',
};

export default function DashboardScreen() {
  const [metrics, setMetrics] = useState<DailyMetrics>(DEFAULT_METRICS);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer for slider changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSliderChange = useCallback((key: keyof DailyMetrics, value: number) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));

    // Auto-predict after slider change (debounced 500ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPrediction({ ...metrics, [key]: value });
    }, 500);
  }, [metrics]);

  const fetchPrediction = async (m: DailyMetrics) => {
    setLoading(true);
    setError(null);
    const result = await PredictAPI.getPrediction(m);
    if (result) {
      setPrediction(result);
    } else {
      setError('Could not reach StressLens API. Ensure the backend is running.');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={fonts.heading}>Stress & Sleep Analyser</Text>
        <Text style={styles.subtitle}>
          Adjust your daily habits — the model explains exactly what's driving your scores
        </Text>
      </View>

      {/* Score Cards */}
      {prediction && (
        <ScoreCards
          stressLevel={prediction.stress_level}
          sleepQuality={prediction.sleep_quality_score}
        />
      )}

      {/* Habit Sliders */}
      <HabitSliders metrics={metrics} onChange={handleSliderChange} />

      {/* Analyse Button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => fetchPrediction(metrics)}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {prediction ? '🔄 Re-analyse' : '🧠 Analyse My Habits'}
          </Text>
        )}
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* SHAP Explanations */}
      {prediction && (
        <>
          <ShapBars
            title="What's driving your stress"
            explanations={prediction.stress_explanations}
          />
          <ShapBars
            title="What's driving your sleep quality"
            explanations={prediction.sleep_explanations}
            positiveColor="#14B8A6"
            negativeColor="#D85A30"
          />

          {/* Recommendations */}
          <Recommendations
            recommendation={prediction.recommendation}
            stressLevel={prediction.stress_level}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: spacing.xl,
  },
  subtitle: {
    ...fonts.small,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.accentBlue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.textDanger,
    fontSize: 13,
  },
});
