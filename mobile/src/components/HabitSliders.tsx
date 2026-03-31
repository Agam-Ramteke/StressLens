import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, radius, spacing, fonts } from '../theme/tokens';
import { DailyMetrics } from '../services/api_service';

type SliderConfig = {
  key: keyof DailyMetrics;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

const SLIDERS: SliderConfig[] = [
  { key: 'daily_screen_time_hours', label: 'Screen time', min: 0, max: 16, step: 0.5, unit: 'hrs' },
  { key: 'phone_usage_before_sleep_minutes', label: 'Phone before bed', min: 0, max: 180, step: 5, unit: 'min' },
  { key: 'sleep_duration_hours', label: 'Sleep duration', min: 3, max: 12, step: 0.5, unit: 'hrs' },
  { key: 'caffeine_intake_cups', label: 'Caffeine', min: 0, max: 10, step: 1, unit: 'cups' },
  { key: 'physical_activity_minutes', label: 'Exercise', min: 0, max: 120, step: 5, unit: 'min' },
  { key: 'notifications_received_per_day', label: 'Notifications / day', min: 0, max: 500, step: 10 },
  { key: 'mental_fatigue_score', label: 'Mental fatigue', min: 1, max: 10, step: 0.5 },
  { key: 'age', label: 'Age', min: 18, max: 70, step: 1 },
];

type Props = {
  metrics: DailyMetrics;
  onChange: (key: keyof DailyMetrics, value: number) => void;
};

export default function HabitSliders({ metrics, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Habits</Text>
      {SLIDERS.map((s) => {
        const val = metrics[s.key] as number;
        return (
          <View key={s.key} style={styles.sliderRow}>
            <Text style={styles.label}>{s.label}</Text>
            <Slider
              style={styles.slider}
              minimumValue={s.min}
              maximumValue={s.max}
              step={s.step}
              value={val}
              onValueChange={(v) => onChange(s.key, v)}
              minimumTrackTintColor={colors.accentBlue}
              maximumTrackTintColor={colors.bgTertiary}
              thumbTintColor={colors.accentBlue}
            />
            <Text style={styles.val}>
              {Number.isInteger(s.step) ? val : val.toFixed(1)}
              {s.unit ? ` ${s.unit}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  title: {
    ...fonts.label,
    marginBottom: spacing.md,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...fonts.small,
    width: 130,
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    height: 36,
  },
  val: {
    ...fonts.small,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 55,
    textAlign: 'right',
  },
});
