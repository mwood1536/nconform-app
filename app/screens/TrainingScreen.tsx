import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { TrainingStatus, TrainingStatuses } from '../constants/standards';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { TrainingRecord } from '../types';
import { formatDate, nowISO } from '../utils/ncrHelpers';
import { buildTrainingHTML, generateAndSharePDF } from '../utils/reports';
import { effectiveTrainingStatus, trainingStatusColor } from '../utils/training';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Training'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatusFilter = 'All' | TrainingStatus;
const STATUS_FILTERS: StatusFilter[] = ['All', ...TrainingStatuses];
type DateFilter = 'All time' | 'This month';

export function TrainingScreen({ navigation }: Props) {
  const { records, reload, updateRecord } = useTraining();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All time');
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const monthStartISO = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const status = effectiveTrainingStatus(r);
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      if (dateFilter === 'This month' && r.createdAt < monthStartISO) return false;
      return true;
    });
  }, [records, statusFilter, dateFilter, monthStartISO]);

  const onSignOff = (record: TrainingRecord) => {
    const today = formatDate(nowISO());
    const completed = record.dateCompleted ? formatDate(record.dateCompleted) : 'the recorded date';
    const statement = `I confirm ${record.employeeName} completed ${record.topic} on ${completed}, signed by ${
      record.trainerName || 'the trainer'
    } on ${today}.`;
    Alert.alert('Digital Sign-Off', statement, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm & Sign',
        onPress: async () => {
          await updateRecord(record.id, {
            signOffStatement: statement,
            signedAt: nowISO(),
            status: 'Complete',
          });
        },
      },
    ]);
  };

  const onExport = async () => {
    if (records.length === 0) {
      Alert.alert('Nothing to export', 'Add a training record first.');
      return;
    }
    setExporting(true);
    try {
      await generateAndSharePDF(buildTrainingHTML(filtered), 'Training-Register.pdf');
    } catch {
      Alert.alert('Could not export', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Training" subtitle="Training sign-offs" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <QuickActionButton
          label="New Training Record"
          variant="amber"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('TrainingForm')}
          fullWidth
        />

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f}
              label={f}
              active={statusFilter === f}
              onPress={() => setStatusFilter(f)}
            />
          ))}
          <FilterPill
            label={dateFilter}
            active={dateFilter === 'This month'}
            onPress={() =>
              setDateFilter((d) => (d === 'All time' ? 'This month' : 'All time'))
            }
          />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="school-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>
              {records.length === 0 ? 'No training records yet' : 'No records in this view'}
            </Text>
            <Text style={styles.emptyBody}>
              {records.length === 0
                ? 'Log completed training and capture digital sign-offs.'
                : 'Adjust the filters above to see other records.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {filtered.map((r) => {
              const status = effectiveTrainingStatus(r);
              const color = trainingStatusColor(status);
              return (
                <View key={r.id} style={styles.card}>
                  <Pressable
                    onPress={() => navigation.navigate('TrainingForm', { recordId: r.id })}
                    style={styles.cardMain}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.employee}>{r.employeeName}</Text>
                      <Text style={styles.topic}>{r.topic}</Text>
                      <Text style={styles.meta}>
                        {r.dateCompleted ? formatDate(r.dateCompleted) : 'No date'} ·{' '}
                        {r.trainerName || 'No trainer'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { borderColor: color + '50', backgroundColor: color + '14' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color }]}>{status}</Text>
                    </View>
                  </Pressable>
                  {r.signOffStatement ? (
                    <View style={styles.signedRow}>
                      <Ionicons name="shield-checkmark" size={14} color={Colors.successGreen} />
                      <Text style={styles.signedText} numberOfLines={2}>
                        {r.signOffStatement}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => onSignOff(r)}
                      style={({ pressed }) => [styles.signBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Ionicons name="create-outline" size={15} color={Colors.card} />
                      <Text style={styles.signBtnLabel}>Sign Off</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <QuickActionButton
          label={exporting ? 'Exporting…' : 'Export Register as PDF'}
          variant="outline"
          icon="document-outline"
          onPress={onExport}
          disabled={exporting}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterPill({ label, active, onPress }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  pillLabel: {
    color: Colors.bodyText,
    fontSize: 12,
    fontWeight: '600',
  },
  pillLabelActive: {
    color: Colors.card,
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
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  employee: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  topic: {
    fontSize: 14,
    color: Colors.bodyText,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  signedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.successGreen + '10',
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  signedText: {
    flex: 1,
    fontSize: 12,
    color: Colors.successGreen,
    fontWeight: '600',
    lineHeight: 17,
  },
  signBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: Radii.button,
    paddingVertical: 10,
  },
  signBtnLabel: {
    color: Colors.card,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
