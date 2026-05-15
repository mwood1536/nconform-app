import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radii } from '../constants/colors';
import { NCRStatus } from '../constants/standards';
import { statusColor } from '../utils/ncrHelpers';

interface Props {
  status: NCRStatus | 'Overdue';
  small?: boolean;
}

export function StatusBadge({ status, small = false }: Props) {
  const color = status === 'Overdue' ? Colors.statusOverdue : statusColor(status);
  return (
    <View
      style={[
        styles.badge,
        small && styles.badgeSmall,
        { backgroundColor: color + '14', borderColor: color + '40' },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, small && styles.labelSmall, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: 11,
  },
});
