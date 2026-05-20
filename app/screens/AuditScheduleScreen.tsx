import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useAudits } from '../hooks/useAudits';
import { RootStackParamList } from '../navigation/types';
import { ScheduledAudit } from '../types';
import { scheduleStatus } from '../utils/auditHelpers';
import { formatDate } from '../utils/ncrHelpers';
import { cancelScheduledNotification } from '../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'AuditSchedule'>;

type ScheduleView = 'List' | 'Calendar';

const MS_PER_DAY = 24 * 3600_000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildCalendarBuckets(items: ScheduledAudit[]): Map<string, ScheduledAudit[]> {
  const map = new Map<string, ScheduledAudit[]>();
  const today = startOfDay(new Date());
  for (let i = 0; i < 30; i++) {
    const day = new Date(today.getTime() + i * MS_PER_DAY);
    map.set(day.toDateString(), []);
  }
  for (const item of items) {
    const due = startOfDay(new Date(item.dueDate));
    const key = due.toDateString();
    if (map.has(key)) {
      map.get(key)?.push(item);
    }
  }
  return map;
}

export function AuditScheduleScreen({ navigation }: Props) {
  const { scheduled, reload, templates, deleteSchedule, updateSchedule } = useAudits();
  const [view, setView] = useState<ScheduleView>('List');

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const now = Date.now();
  const annotated = useMemo(
    () =>
      scheduled.map((s) => ({ ...s, status: scheduleStatus(s, now) })),
    [scheduled, now],
  );

  const overdue = annotated.filter((s) => s.status === 'Overdue');
  const upcoming = annotated.filter((s) => s.status === 'Upcoming');

  const calendar = useMemo(() => buildCalendarBuckets(annotated), [annotated]);

  const onCancel = (item: ScheduledAudit) => {
    Alert.alert(
      'Cancel scheduled audit?',
      `Remove "${item.name}" from the schedule. The template stays available for reuse.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Audit',
          style: 'destructive',
          onPress: async () => {
            await cancelScheduledNotification(item.notificationId);
            await deleteSchedule(item.id);
          },
        },
      ],
    );
  };

  const onMarkComplete = (item: ScheduledAudit) => {
    void updateSchedule(item.id, { status: 'Completed' });
  };

  const onStartFromTemplate = (item: ScheduledAudit) => {
    if (!item.templateId) {
      navigation.navigate('AuditBuilder');
      return;
    }
    const template = templates.find((t) => t.id === item.templateId);
    if (!template) {
      Alert.alert('Template missing', 'The source template was deleted.');
      return;
    }
    navigation.navigate('AuditBuilder', { templateId: item.templateId });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Audit Schedule"
        subtitle="Upcoming and overdue audits"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.toggleRow}>
        {(['List', 'Calendar'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={({ pressed }) => [
              styles.togglePill,
              view === v && styles.togglePillActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.togglePillText, view === v && styles.togglePillTextActive]}>
              {v}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {annotated.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
            <Text style={styles.emptyBody}>
              Enable recurring schedule on an audit template to populate this view.
            </Text>
            <QuickActionButton
              label="Build an Audit"
              variant="amber"
              icon="add-circle-outline"
              onPress={() => navigation.navigate('AuditBuilder')}
            />
          </View>
        ) : view === 'List' ? (
          <View style={{ gap: Spacing.md }}>
            {overdue.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Overdue · {overdue.length}</Text>
                <View style={{ gap: Spacing.sm }}>
                  {overdue.map((item) => (
                    <ScheduleRow
                      key={item.id}
                      item={item}
                      onStart={() => onStartFromTemplate(item)}
                      onCancel={() => onCancel(item)}
                      onComplete={() => onMarkComplete(item)}
                    />
                  ))}
                </View>
              </>
            ) : null}
            <Text style={styles.sectionLabel}>Upcoming · {upcoming.length}</Text>
            {upcoming.length === 0 ? (
              <Text style={styles.smallEmpty}>Nothing due in the near future.</Text>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {upcoming.map((item) => (
                  <ScheduleRow
                    key={item.id}
                    item={item}
                    onStart={() => onStartFromTemplate(item)}
                    onCancel={() => onCancel(item)}
                    onComplete={() => onMarkComplete(item)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {Array.from(calendar.entries()).map(([key, list]) => (
              <View key={key} style={styles.calendarRow}>
                <View style={styles.calendarDay}>
                  <Text style={styles.calendarDayLabel}>
                    {new Date(key).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <View
                    style={[
                      styles.calendarCountPill,
                      list.length > 0 && { backgroundColor: Colors.amber + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarCountText,
                        list.length > 0 && { color: Colors.amber },
                      ]}
                    >
                      {list.length}
                    </Text>
                  </View>
                </View>
                {list.length === 0 ? null : (
                  <View style={{ gap: 4 }}>
                    {list.map((item) => (
                      <Text key={item.id} style={styles.calendarItem}>
                        • {item.name}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ScheduleRowProps {
  item: ScheduledAudit;
  onStart: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

function ScheduleRow({ item, onStart, onCancel, onComplete }: ScheduleRowProps) {
  const overdue = item.status === 'Overdue';
  return (
    <View style={[styles.scheduleCard, overdue && styles.scheduleCardOverdue]}>
      <View style={styles.scheduleHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.scheduleName}>{item.name}</Text>
          <Text style={styles.scheduleMeta}>
            {item.layer} · {item.standard}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            overdue
              ? { borderColor: Colors.errorRed + '50', backgroundColor: Colors.errorRed + '14' }
              : { borderColor: Colors.steelBlue + '50', backgroundColor: Colors.steelBlue + '14' },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: overdue ? Colors.errorRed : Colors.steelBlue },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.scheduleDue}>
        Due {formatDate(item.dueDate)}
        {item.assignedTo ? ` · ${item.assignedTo}` : ''}
        {item.escalationParentAuditId ? ' · Escalation' : ''}
      </Text>
      <View style={styles.scheduleActions}>
        <QuickActionButton label="Start" variant="amber" icon="play-outline" onPress={onStart} />
        <QuickActionButton
          label="Mark Done"
          variant="outline"
          icon="checkmark-outline"
          onPress={onComplete}
        />
        <QuickActionButton label="Cancel" variant="ghost" icon="close-outline" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  togglePillActive: {
    borderColor: Colors.navy,
    backgroundColor: Colors.navy,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.bodyText,
  },
  togglePillTextActive: {
    color: Colors.card,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
  },
  smallEmpty: {
    fontSize: 13,
    color: Colors.secondaryText,
    paddingVertical: Spacing.sm,
  },
  scheduleCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  scheduleCardOverdue: {
    borderColor: Colors.errorRed + '60',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  scheduleName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  scheduleMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  scheduleDue: {
    fontSize: 12,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  scheduleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  calendarRow: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  calendarDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarDayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  calendarCountPill: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.border,
    alignItems: 'center',
  },
  calendarCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  calendarItem: {
    fontSize: 12,
    color: Colors.bodyText,
  },
});
