import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fonts } from '../theme/tokens';
import { FeatureContribution, FEATURE_LABELS } from '../services/api_service';

type Props = {
  title: string;
  explanations: FeatureContribution[];
  positiveColor?: string;  // color for "raises" contributions
  negativeColor?: string;  // color for "lowers" contributions
};

export default function ShapBars({
  title,
  explanations,
  positiveColor = '#D85A30',
  negativeColor = '#14B8A6',
}: Props) {
  // Sort by absolute contribution and take top 6
  const sorted = [...explanations]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6);

  const maxAbs = Math.max(...sorted.map((e) => Math.abs(e.contribution)), 0.1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {sorted.map((expl, idx) => {
        const isPositive = expl.contribution > 0;
        const barColor = isPositive ? positiveColor : negativeColor;
        const pct = (Math.abs(expl.contribution) / maxAbs) * 100;
        const label = FEATURE_LABELS[expl.feature_name] || expl.feature_name;

        return (
          <View key={idx} style={styles.barRow}>
            <Text style={styles.featLabel} numberOfLines={1}>{label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.num, { color: barColor }]}>
              {isPositive ? '+' : ''}{expl.contribution.toFixed(2)}
            </Text>
          </View>
        );
      })}
      <Text style={styles.note}>
        Bar width = contribution magnitude. Orange = raises, teal = lowers.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  title: {
    ...fonts.label,
    marginBottom: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featLabel: {
    ...fonts.small,
    width: 110,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barInner: {
    height: '100%',
    borderRadius: 4,
  },
  num: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  note: {
    ...fonts.small,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
