import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DepartmentBreakdown'>;

interface Bucket {
  department: string;
  total: number;
  open: number;
  closed: number;
  bySeverity: Record<string, number>;
  ncrIds: string[];
}

export function DepartmentBreakdownScreen({ navigation }: Props) {
  const { ncrs } = useNCRs();

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const n of ncrs) {
      const label = n.department || 'Unspecified';
      const existing = map.get(label) ?? {
        department: label,
        total: 0,
        open: 0,
        closed: 0,
        bySeverity: { Low: 0, Medium: 0, High: 0, Critical: 0 },
        ncrIds: [],
      };
      existing.total += 1;
      if (n.status === 'Closed') existing.closed += 1;
      else existing.open += 1;
      existing.bySeverity[n.severity] = (existing.bySeverity[n.severity] ?? 0) + 1;
      existing.ncrIds.push(n.id);
      map.set(label, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [ncrs]);

  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="By Department"
        subtitle="NCRs grouped by area"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {buckets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>No NCRs yet</Text>
            <Text style={styles.emptyBody}>
              Add Department on new NCRs to populate this breakdown.
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {buckets.map((b) => (
              <Pressable
                key={b.department}
                onPress={() =>
                  navigation.navigate('Main', {
                    screen: 'NCRs',
                    params: { filterIds: b.ncrIds, filterTitle: b.department },
                  })
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
              >
                <View style={styles.headRow}>
                  <Text style={styles.deptName}>{b.department}</Text>
                  <Text style={styles.total}>{b.total}</Text>
                </View>
                <View style={styles.barWrap}>
                  <Svg width={260} height={14}>
                    <Rect
                      x={0}
                      y={0}
                      width={(b.total / max) * 260}
                      height={14}
                      rx={4}
                      fill={Colors.navy}
                    />
                  </Svg>
                </View>
                <Text style={styles.metaText}>
                  Open {b.open} · Closed {b.closed} · Critical {b.bySeverity.Critical ?? 0} · High {b.bySeverity.High ?? 0}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: 6,
    ...Shadow.card,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deptName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  barWrap: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  metaText: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 4,
  },
});
