// StressLens Design Tokens — inspired by the HTML dashboard's clean aesthetic
export const colors = {
  // Backgrounds
  bgPrimary: '#0A0E1A',      // Deep navy
  bgSecondary: '#131829',     // Card background
  bgTertiary: '#1B2036',      // Input/slider area
  bgCard: '#171D30',          // Elevated cards

  // Accents
  accentBlue: '#3B82F6',
  accentTeal: '#14B8A6',
  accentRed: '#EF4444',
  accentAmber: '#F59E0B',
  accentPurple: '#8B5CF6',

  // Semantic
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.12)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textDanger: '#FCA5A5',
  textWarning: '#FCD34D',
  textSuccess: '#6EE7B7',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const fonts = {
  regular: { fontSize: 14, color: colors.textPrimary },
  small: { fontSize: 12, color: colors.textSecondary },
  label: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  heading: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary },
  metric: { fontSize: 32, fontWeight: '600' as const },
};
