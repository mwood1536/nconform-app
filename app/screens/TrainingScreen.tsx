import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { MetricCard } from '../components/MetricCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { TrainingStatus, TrainingStatuses } from '../constants/standards';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { ScheduledTraining, TrainingRecord, TrainingRecurrence } from '../types';
import { formatDate, generateId, nowISO } from '../utils/ncrHelpers';
import { buildTrainingHTML, generateAndSharePDF } from '../utils/reports';
import {
  cancelScheduledNotification,
  scheduleTrainingReminder,
} from '../utils/notifications';
import {
  daysUntil,
  effectiveTrainingStatus,
  expiringBuckets,
  nextRecurrenceDate,
  scheduledTrainingStatus,
  trainingStatusColor,
} from '../utils/training';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Training'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatusFilter = 'All' | TrainingStatus | 'Expiring Soon';
const STATUS_FILTERS: StatusFilter[] = ['All', ...TrainingStatuses, 'Expiring Soon'];
type DateFilter = 'All time' | 'This month';

export function TrainingScreen({ navigation }: Props) {
  const {
    records,
    templates,
    scheduled,
    reload,
    updateRecord,
    saveScheduled,
  } = useTraining();
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

  const buckets = useMemo(() => expiringBuckets(records), [records]);

  const annotatedScheduled = useMemo(
    () => scheduled.map((s) => ({ ...s, status: scheduledTrainingStatus(s) })),
    [scheduled],
  );
  const overdueScheduled = annotatedScheduled.filter((s) => s.status === 'Overdue');
  const upcomingScheduled = annotatedScheduled.filter((s) => s.status === 'Upcoming');
  const calendar30 = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = today.getTime() + 30 * 24 * 3600_000;
    return annotatedScheduled.filter(
      (s) => s.status !== 'Completed' && new Date(s.dueDate).getTime() <= cutoff,
    );
  }, [annotatedScheduled]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const status = effectiveTrainingStatus(r);
      if (statusFilter === 'Expiring Soon') {
        const days = daysUntil(r.certificationExpiresOn);
        if (days === null || days > 90) return false;
      } else if (statusFilter !== 'All' && status !== statusFilter) {
        return false;
      }
      if (dateFilter === 'This month' && r.createdAt < monthStartISO) return false;
      return true;
    });
  }, [records, statusFilter, dateFilter, monthStartISO]);

  const scheduleFollowUp = async (record: TrainingRecord, recurrence: TrainingRecurrence) => {
    const baseDate = record.dateCompleted ? new Date(record.dateCompleted) : new Date();
    const nextDue = nextRecurrenceDate(recurrence, baseDate);
    const notificationId = await scheduleTrainingReminder({
      title: `Training due: ${record.topic}`,
      body: `${record.employeeName} — recurring per ${recurrence.frequency}`,
      date: new Date(Math.max(Date.now() + 60_000, nextDue.getTime() - 24 * 3600_000)),
    });
    const item: ScheduledTraining = {
      id: generateId('schT'),
      templateId: record.templateId,
      topic: record.topic,
      employeeName: record.employeeName,
      dueDate: nextDue.toISOString(),
      status: 'Upcoming',
      parentRecordId: record.id,
      notificationId,
      createdAt: nowISO(),
    };
    await saveScheduled(item);
  };

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
          const updated = await updateRecord(record.id, {
            signOffStatement: statement,
            signedAt: nowISO(),
            status: 'Complete',
          });
          if (updated?.recurrence) {
            await scheduleFollowUp(updated, updated.recurrence);
          }
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

  const onCancelScheduled = (item: ScheduledTraining) => {
    Alert.alert('Cancel scheduled training?', `Remove "${item.topic}" from the upcoming list?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          await cancelScheduledNotification(item.notificationId);
          await saveScheduled({ ...item, status: 'Cancelled' });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Training" subtitle="Training sign-offs" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Expiring 30d"
            value={buckets.in30}
            accent={buckets.in30 > 0 ? 'amber' : 'neutral'}
            icon="time-outline"
          />
          <MetricCard
            label="Expiring 60d"
            value={buckets.in60}
            icon="hourglass-outline"
          />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Expiring 90d"
            value={buckets.in90}
            icon="alarm-outline"
          />
          <MetricCard
            label="Expired"
            value={buckets.expired}
            accent={buckets.expired > 0 ? 'red' : 'neutral'}
            icon="alert-circle-outline"
          />
        </View>

        <QuickActionButton
          label="New Training Record"
          variant="amber"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('TrainingForm')}
          fullWidth
        />

        <Pressable
          onPress={() => navigation.navigate('TrainingTemplates')}
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="library-outline" size={18} color={Colors.steelBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Training Templates</Text>
            <Text style={styles.linkSub}>
              {templates.length} prebuilt + custom types for quick logging
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
        </Pressable>

        <Text style={styles.sectionLabel}>Upcoming Training</Text>
        {calendar30.length === 0 ? (
          <View style={styles.smallCard}>
            <Ionicons name="calendar-outline" size={16} color={Colors.secondaryText} />
            <Text style={styles.smallCardText}>Nothing scheduled in the next 30 days.</Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {overdueScheduled.length > 0 ? (
              <Text style={styles.subSectionLabel}>Overdue · {overdueScheduled.length}</Text>
            ) : null}
            {overdueScheduled.map((item) => (
              <ScheduledRow
                key={item.id}
                item={item}
                onCancel={() => onCancelScheduled(item)}
                onOpen={() =>
                  navigation.navigate('TrainingForm', {
                    templateId: item.templateId ?? undefined,
                  })
                }
              />
            ))}
            {upcomingScheduled.length > 0 ? (
              <Text style={styles.subSectionLabel}>Next 30 days · {calendar30.length - overdueScheduled.length}</Text>
            ) : null}
            {calendar30
              .filter((s) => s.status === 'Upcoming')
              .map((item) => (
                <ScheduledRow
                  key={item.id}
                  item={item}
                  onCancel={() => onCancelScheduled(item)}
                  onOpen={() =>
                    navigation.navigate('TrainingForm', {
                      templateId: item.templateId ?? undefined,
                    })
                  }
                />
              ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>Records</Text>
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
              const expiresInDays = daysUntil(r.certificationExpiresOn);
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
                      <View style={styles.tagRow}>
                        {r.materials.length > 0 ? (
                          <View style={styles.tag}>
                            <Ionicons
                              name="document-text-outline"
                              size={11}
                              color={Colors.steelBlue}
                            />
                            <Text style={[styles.tagText, { color: Colors.steelBlue }]}>
                              {r.materials.length} material{r.materials.length === 1 ? '' : 's'}
                            </Text>
                          </View>
                        ) : null}
                        {r.recurrence ? (
                          <View style={styles.tag}>
                            <Ionicons name="repeat-outline" size={11} color={Colors.navy} />
                            <Text style={[styles.tagText, { color: Colors.navy }]}>
                              {r.recurrence.frequency}
                            </Text>
                          </View>
                        ) : null}
                        {expiresInDays !== null ? (
                          <View
                            style={[
                              styles.tag,
                              {
                                backgroundColor:
                                  expiresInDays < 0
                                    ? Colors.errorRed + '14'
                                    : expiresInDays <= 30
                                      ? Colors.amber + '14'
                                      : Colors.steelBlue + '14',
                              },
                            ]}
                          >
                            <Ionicons
                              name="time-outline"
                              size={11}
                              color={
                                expiresInDays < 0
                                  ? Colors.errorRed
                                  : expiresInDays <= 30
                                    ? Colors.amber
                                    : Colors.steelBlue
                              }
                            />
                            <Text
                              style={[
                                styles.tagText,
                                {
                                  color:
                                    expiresInDays < 0
                                      ? Colors.errorRed
                                      : expiresInDays <= 30
                                        ? Colors.amber
                                        : Colors.steelBlue,
                                },
                              ]}
                            >
                              {expiresInDays < 0
                                ? `Expired ${-expiresInDays}d ago`
                                : `Expires in ${expiresInDays}d`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
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

        <AdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

interface ScheduledRowProps {
  item: ScheduledTraining;
  onCancel: () => void;
  onOpen: () => void;
}

function ScheduledRow({ item, onCancel, onOpen }: ScheduledRowProps) {
  const overdue = item.status === 'Overdue';
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.scheduleRow,
        overdue && styles.scheduleRowOverdue,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Ionicons
        name={overdue ? 'alert-circle' : 'calendar-outline'}
        size={18}
        color={overdue ? Colors.errorRed : Colors.steelBlue}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.scheduleTopic}>{item.topic}</Text>
        <Text style={styles.scheduleMeta}>
          {item.employeeName ? `${item.employeeName} · ` : ''}Due {formatDate(item.dueDate)}
        </Text>
      </View>
      <Pressable onPress={onCancel} hitSlop={8}>
        <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
      </Pressable>
    </Pressable>
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
  metricsRow: {
    flexDirection: 'row',
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.steelBlue + '14',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    ...Shadow.card,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  linkSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  subSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  smallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.md,
  },
  smallCardText: {
    fontSize: 13,
    color: Colors.secondaryText,
    flex: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.md,
  },
  scheduleRowOverdue: {
    borderColor: Colors.errorRed + '50',
  },
  scheduleTopic: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  scheduleMeta: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});
