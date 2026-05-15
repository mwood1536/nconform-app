import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';

interface Props {
  label: string;
  value: number | string;
  accent?: 'neutral' | 'amber' | 'red' | 'green' | 'navy';
  icon?: keyof typeof Ionicons.glyphMap;
}

const accentMap: Record<NonNullable<Props['accent']>, string> = {
  neutral: Colors.navy,
  amber: Colors.amber,
  red: Colors.errorRed,
  green: Colors.successGreen,
  navy: Colors.navy,
};

export function MetricCard({ label, value, accent = 'neutral', icon }: Props) {
  const color = accentMap[accent];
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <Ionicons name={icon} size={16} color={Colors.secondaryText} /> : null}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <View style={[styles.accentBar, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
