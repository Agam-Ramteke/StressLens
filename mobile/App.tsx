import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Gender,
  Metrics,
  NumericMetric,
  Occupation,
  Prediction,
  checkHealth,
  defaultApiUrl,
  genders,
  occupations,
  predict,
} from './src/api';
import { colors, radius, spacing } from './src/theme';

const initialMetrics: Metrics = {
  age: 28,
  gender: 'Male',
  occupation: 'Software Engineer',
  daily_screen_time_hours: 7,
  phone_usage_before_sleep_minutes: 60,
  sleep_duration_hours: 6.5,
  caffeine_intake_cups: 2,
  physical_activity_minutes: 30,
  notifications_received_per_day: 150,
  mental_fatigue_score: 6,
};

const metricControls: Array<{
  key: NumericMetric;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  { key: 'age', label: 'Age', min: 18, max: 70, step: 1 },
  { key: 'daily_screen_time_hours', label: 'Screen time', min: 0, max: 16, step: 0.5, unit: 'hr' },
  { key: 'phone_usage_before_sleep_minutes', label: 'Phone before bed', min: 0, max: 180, step: 5, unit: 'min' },
  { key: 'sleep_duration_hours', label: 'Sleep duration', min: 3, max: 12, step: 0.5, unit: 'hr' },
  { key: 'caffeine_intake_cups', label: 'Caffeine', min: 0, max: 10, step: 1, unit: 'cups' },
  { key: 'physical_activity_minutes', label: 'Activity', min: 0, max: 180, step: 5, unit: 'min' },
  { key: 'notifications_received_per_day', label: 'Notifications', min: 0, max: 500, step: 10 },
  { key: 'mental_fatigue_score', label: 'Mental fatigue', min: 1, max: 10, step: 0.5 },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const roundForStep = (value: number, step: number) => {
  const decimals = Number.isInteger(step) ? 0 : 1;
  return Number(value.toFixed(decimals));
};

export default function App() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [apiReady, setApiReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const ready = await checkHealth(apiUrl);
      setApiReady(ready);
      if (!ready) setMessage('Backend found, but models need training.');
    } catch (error) {
      setApiReady(false);
      setMessage(error instanceof Error ? error.message : 'Could not reach the backend.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void runHealthCheck();
  }, []);

  const updateMetric = (key: NumericMetric, next: number) => {
    const control = metricControls.find((item) => item.key === key);
    if (!control) return;
    const value = roundForStep(clamp(next, control.min, control.max), control.step);
    setMetrics((current) => ({ ...current, [key]: value }));
  };

  const runPrediction = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await predict(apiUrl, metrics);
      setPrediction(result);
      setApiReady(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>StressLens</Text>
          <Text style={styles.title}>Check today before it checks you.</Text>
          <Text style={styles.body}>
            Enter daily habits, run the trained model, and see the strongest stress and sleep drivers.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle}>Backend</Text>
            <Text style={[styles.status, apiReady ? styles.ready : styles.notReady]}>
              {checking ? 'Checking' : apiReady ? 'Ready' : 'Offline'}
            </Text>
          </View>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Pressable style={styles.secondaryButton} onPress={runHealthCheck}>
            <Text style={styles.secondaryButtonText}>Check connection</Text>
          </Pressable>
        </View>

        <View style={styles.scoreGrid}>
          <ScoreCard
            label="Stress"
            value={prediction?.stress_level}
            band={prediction?.stress_band}
            baseline={prediction?.base_stress_score}
            tone="stress"
          />
          <ScoreCard
            label="Sleep"
            value={prediction?.sleep_quality_score}
            band={prediction?.sleep_band}
            baseline={prediction?.base_sleep_score}
            tone="sleep"
          />
        </View>

        <ChoiceGroup
          title="Gender"
          values={genders}
          selected={metrics.gender}
          onSelect={(gender) => setMetrics((current) => ({ ...current, gender }))}
        />

        <ChoiceGroup
          title="Occupation"
          values={occupations}
          selected={metrics.occupation}
          onSelect={(occupation) => setMetrics((current) => ({ ...current, occupation }))}
        />

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Daily metrics</Text>
          {metricControls.map((control) => (
            <MetricStepper
              key={control.key}
              label={control.label}
              value={metrics[control.key]}
              unit={control.unit}
              onDecrease={() => updateMetric(control.key, metrics[control.key] - control.step)}
              onIncrease={() => updateMetric(control.key, metrics[control.key] + control.step)}
            />
          ))}
        </View>

        <Pressable disabled={loading} style={[styles.primaryButton, loading && styles.disabled]} onPress={runPrediction}>
          {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryButtonText}>Run analysis</Text>}
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {prediction ? (
          <>
            <ContributionPanel title="Stress drivers" rows={prediction.stress_explanations} mode="stress" />
            <ContributionPanel title="Sleep drivers" rows={prediction.sleep_explanations} mode="sleep" />
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {prediction.recommendations.map((item, index) => (
                <View key={item} style={styles.recommendation}>
                  <Text style={styles.recommendationIndex}>{index + 1}</Text>
                  <Text style={styles.recommendationText}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreCard({
  label,
  value,
  band,
  baseline,
  tone,
}: {
  label: string;
  value?: number;
  band?: string;
  baseline?: number;
  tone: 'stress' | 'sleep';
}) {
  const color = tone === 'stress' ? colors.red : colors.blue;
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.score, { color }]}>{value === undefined ? '--' : value.toFixed(1)}</Text>
      <Text style={styles.body}>{band ?? 'Waiting'}</Text>
      <Text style={styles.muted}>Baseline {baseline === undefined ? '--' : baseline.toFixed(1)}</Text>
    </View>
  );
}

function ChoiceGroup<T extends Gender | Occupation>({
  title,
  values,
  selected,
  onSelect,
}: {
  title: string;
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipWrap}>
        {values.map((value) => (
          <Pressable key={value} style={[styles.chip, selected === value && styles.chipActive]} onPress={() => onSelect(value)}>
            <Text style={[styles.chipText, selected === value && styles.chipTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MetricStepper({
  label,
  value,
  unit,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  unit?: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLabel}>
        <Text style={styles.bodyStrong}>{label}</Text>
        <Text style={styles.muted}>
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <View style={styles.stepper}>
        <Pressable style={styles.stepButton} onPress={onDecrease}>
          <Text style={styles.stepText}>-</Text>
        </Pressable>
        <Pressable style={styles.stepButton} onPress={onIncrease}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ContributionPanel({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: Prediction['stress_explanations'];
  mode: 'stress' | 'sleep';
}) {
  const topRows = rows.slice(0, 6);
  const max = Math.max(...topRows.map((row) => Math.abs(row.contribution)), 0.1);
  const positive = mode === 'stress' ? colors.red : colors.blue;
  const negative = mode === 'stress' ? colors.green : colors.yellow;

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {topRows.map((row) => {
        const width = `${(Math.abs(row.contribution) / max) * 100}%` as `${number}%`;
        const color = row.contribution >= 0 ? positive : negative;
        return (
          <View key={row.feature} style={styles.contributionRow}>
            <View style={styles.contributionLabel}>
              <Text style={styles.bodyStrong} numberOfLines={1}>
                {row.label}
              </Text>
              <Text style={styles.muted}>{row.contribution >= 0 ? 'Raises score' : 'Lowers score'}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width, backgroundColor: color }]} />
            </View>
            <Text style={[styles.contributionValue, { color }]}>
              {row.contribution >= 0 ? '+' : ''}
              {row.contribution.toFixed(2)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingVertical: spacing.xl,
  },
  eyebrow: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyStrong: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  muted: {
    color: colors.quiet,
    fontSize: 12,
    lineHeight: 16,
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    minWidth: 76,
    textAlign: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingVertical: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  ready: {
    color: colors.green,
    backgroundColor: colors.greenSoft,
  },
  notReady: {
    color: colors.red,
    backgroundColor: colors.redSoft,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    backgroundColor: colors.panelRaised,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.bg,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
  message: {
    color: colors.yellow,
    backgroundColor: colors.yellowSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scoreGrid: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  scoreCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
  },
  score: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    marginVertical: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  chip: {
    minHeight: 40,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.panelRaised,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    margin: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  chipTextActive: {
    color: colors.green,
  },
  metricRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  metricLabel: {
    flex: 1,
    paddingRight: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
  },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.panelRaised,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  stepText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  contributionLabel: {
    width: 112,
    paddingRight: spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.panelRaised,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  contributionValue: {
    width: 58,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  recommendation: {
    flexDirection: 'row',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  recommendationIndex: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    color: colors.green,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '900',
    marginRight: spacing.md,
  },
  recommendationText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
