import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { NCR } from '../types';
import { daysOpen, daysOpenColor, formatDate, isOverdue } from '../utils/ncrHelpers';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface Props {
  ncr: NCR;
  onPress: (ncr: NCR) => void;
  compact?: boolean;
}

export function NCRCard({ ncr, onPress, compact = false }: Props) {
  const days = daysOpen(ncr);
  const overdue = isOverdue(ncr);
  const ageColor = daysOpenColor(days);
  return (
    <Pressable
      onPress={() => onPress(ncr)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.ncrNumber}>{ncr.ncrNumber}</Text>
        <StatusBadge status={overdue ? 'Overdue' : ncr.status} small />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {ncr.title || 'Untitled nonconformance'}
      </Text>
      {!compact ? (
        <View style={styles.metaRow}>
          <SeverityBadge severity={ncr.severity} small />
          <View style={styles.metaItem}>
            <Ionicons name="locate-outline" size={13} color={Colors.secondaryText} />
            <Text style={styles.metaText} numberOfLines={1}>
              {ncr.detectionPoint}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.footerRow}>
        <Text style={styles.dateText}>{formatDate(ncr.createdAt)}</Text>
        <View style={styles.ageWrap}>
          <Ionicons name="time-outline" size={13} color={ageColor} />
          <Text style={[styles.ageText, { color: ageColor }]}>
            {days === 0 ? 'New today' : `${days}d open`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ncrNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.bodyText,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  ageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ageText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
