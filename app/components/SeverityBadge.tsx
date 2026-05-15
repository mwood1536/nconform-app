import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Radii } from '../constants/colors';
import { Severity } from '../constants/standards';
import { severityColor } from '../utils/ncrHelpers';

interface Props {
  severity: Severity;
  small?: boolean;
}

export function SeverityBadge({ severity, small = false }: Props) {
  const color = severityColor(severity);
  return (
    <View
      style={[
        styles.badge,
        small && styles.badgeSmall,
        { backgroundColor: color + '12', borderColor: color + '40' },
      ]}
    >
      <Text style={[styles.text, small && styles.textSmall, { color }]}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  textSmall: {
    fontSize: 11,
  },
});
