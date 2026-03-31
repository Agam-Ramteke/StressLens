import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fonts } from '../theme/tokens';

type Props = {
  stressLevel: number;
  sleepQuality: number;
};

const getStressTag = (val: number) => {
  if (val >= 7) return { label: 'High', color: colors.textDanger, bg: colors.dangerBg };
  if (val >= 4) return { label: 'Moderate', color: colors.textWarning, bg: colors.warningBg };
  return { label: 'Low', color: colors.textSuccess, bg: colors.successBg };
};

const getSleepTag = (val: number) => {
  if (val >= 7) return { label: 'Good', color: colors.textSuccess, bg: colors.successBg };
  if (val >= 5) return { label: 'Fair', color: colors.textWarning, bg: colors.warningBg };
  return { label: 'Poor', color: colors.textDanger, bg: colors.dangerBg };
};

export default function ScoreCards({ stressLevel, sleepQuality }: Props) {
  const stressTag = getStressTag(stressLevel);
  const sleepTag = getSleepTag(sleepQuality);

  return (
    <View style={styles.row}>
      {/* Stress Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Stress Level</Text>
        <Text style={[styles.value, { color: stressTag.color }]}>
          {stressLevel.toFixed(1)}
        </Text>
        <View style={[styles.tag, { backgroundColor: stressTag.bg }]}>
          <Text style={[styles.tagText, { color: stressTag.color }]}>{stressTag.label}</Text>
        </View>
      </View>

      {/* Sleep Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Sleep Quality</Text>
        <Text style={[styles.value, { color: sleepTag.color }]}>
          {sleepQuality.toFixed(1)}
        </Text>
        <View style={[styles.tag, { backgroundColor: sleepTag.bg }]}>
          <Text style={[styles.tagText, { color: sleepTag.color }]}>{sleepTag.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  label: {
    ...fonts.small,
    marginBottom: spacing.xs,
  },
  value: {
    ...fonts.metric,
    marginBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
