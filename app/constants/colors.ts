export const Colors = {
  background: '#F8F9FB',
  card: '#FFFFFF',
  navy: '#1B2A4A',
  steelBlue: '#4A7FA5',
  amber: '#F59E0B',
  successGreen: '#2D6A4F',
  errorRed: '#C0392B',
  bodyText: '#1A1A2E',
  secondaryText: '#6B7280',
  border: '#E2E8F0',

  severityLow: '#6B7280',
  severityMedium: '#D4A017',
  severityHigh: '#F59E0B',
  severityCritical: '#C0392B',

  statusOpen: '#F59E0B',
  statusInProgress: '#4A7FA5',
  statusClosed: '#2D6A4F',
  statusOverdue: '#C0392B',

  shadow: '#1B2A4A',
} as const;

export const Radii = {
  card: 8,
  button: 6,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Shadow = {
  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.navy, letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.navy, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.navy, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.bodyText },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, color: Colors.bodyText },
  caption: { fontSize: 13, fontWeight: '400' as const, color: Colors.secondaryText },
  label: { fontSize: 13, fontWeight: '600' as const, color: Colors.bodyText, letterSpacing: 0.2 },
};
