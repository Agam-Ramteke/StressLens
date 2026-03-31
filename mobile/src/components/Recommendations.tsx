import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fonts } from '../theme/tokens';

type Props = {
  recommendation: string;
  stressLevel: number;
};

export default function Recommendations({ recommendation, stressLevel }: Props) {
  // Split by pipe separator used by the backend
  const parts = recommendation.split(' | ').filter(Boolean);

  const getStyle = (text: string) => {
    if (text.toLowerCase().includes('great work') || text.toLowerCase().includes('healthy'))
      return { border: colors.success, bg: colors.successBg };
    if (text.toLowerCase().includes('medical') || text.toLowerCase().includes('concern'))
      return { border: colors.warning, bg: colors.warningBg };
    return { border: colors.danger, bg: colors.dangerBg };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personalised Recommendations</Text>
      {parts.map((text, idx) => {
        const s = getStyle(text);
        return (
          <View key={idx} style={[styles.rec, { borderLeftColor: s.border, backgroundColor: s.bg }]}>
            <Text style={styles.recText}>{text}</Text>
          </View>
        );
      })}
      <Text style={styles.note}>
        Note: caffeine warnings fire at {'>'} 4 cups regardless of ML score — medical threshold override.
      </Text>
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
  rec: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
  },
  recText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  note: {
    ...fonts.small,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
