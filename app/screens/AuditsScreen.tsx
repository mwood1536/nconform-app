import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { FeatureLock } from '../components/FeatureLock';
import { MetricCard } from '../components/MetricCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useAudits } from '../hooks/useAudits';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { Audit } from '../types';
import { formatDate } from '../utils/ncrHelpers';
import { adsEnabled, isBundle } from '../utils/subscription';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Audits'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatusFilter = 'All' | 'In Progress' | 'Completed';
const STATUS_FILTERS: StatusFilter[] = ['All', 'In Progress', 'Completed'];
type DateFilter = 'All time' | 'This month';

export function AuditsScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const { audits, templates, reload, deleteTemplate } = useAudits();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All time');

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const monthStartISO = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const metrics = useMemo(() => {
    const thisMonth = audits.filter((a) => a.createdAt >= monthStartISO);
    const completed = audits.filter((a) => a.status === 'Completed');
    const completedRates = completed.map((a) => a.passRate);
    const avgPass =
      completedRates.length === 0
        ? 0
        : Math.round(completedRates.reduce((s, n) => s + n, 0) / completedRates.length);
    return {
      scheduledThisMonth: thisMonth.length,
      completed: completed.length,
      passRate: avgPass,
    };
  }, [audits, monthStartISO]);

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (dateFilter === 'This month' && a.createdAt < monthStartISO) return false;
      return true;
    });
  }, [audits, statusFilter, dateFilter, monthStartISO]);

  if (!isBundle(profile)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Audits" subtitle="Layered Process Audits" />
        <FeatureLock
          tier="bundle"
          title="Layered Process Audits"
          description="Schedule and run multi-layer process audits, score them automatically, and turn failed items into NCRs."
          bullets={[
            'Layer 1–3 audit builder with reusable templates',
            'Pass / Fail / N-A scoring with photo evidence',
            'Auto-generate NCRs from failed items',
            'Audit history and pass-rate trends',
          ]}
          onUpgrade={() => navigation.navigate('Settings')}
        />
        {adsEnabled(profile) ? (
          <AdBanner visible onUpgrade={() => navigation.navigate('Settings')} />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Audits" subtitle="Layered Process Audits" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Scheduled (mo)"
            value={metrics.scheduledThisMonth}
            icon="calendar-outline"
          />
          <MetricCard
            label="Completed"
            value={metrics.completed}
            accent={metrics.completed > 0 ? 'green' : 'neutral'}
            icon="checkmark-done-outline"
          />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Avg Pass Rate"
            value={`${metrics.passRate}%`}
            accent={metrics.passRate >= 80 ? 'green' : metrics.passRate > 0 ? 'amber' : 'neutral'}
            icon="trending-up-outline"
          />
          <MetricCard
            label="Templates"
            value={templates.length}
            icon="bookmark-outline"
          />
        </View>

        <QuickActionButton
          label="Create Audit"
          variant="amber"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('AuditBuilder')}
          fullWidth
        />

        {templates.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Saved Templates</Text>
            <View style={{ gap: Spacing.sm }}>
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => navigation.navigate('AuditBuilder', { templateId: t.id })}
                  style={({ pressed }) => [styles.templateRow, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.templateIcon}>
                    <Ionicons name="bookmark" size={16} color={Colors.steelBlue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateName}>{t.name}</Text>
                    <Text style={styles.templateMeta}>
                      {t.layer} · {t.standard} · {t.questions.length} questions
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteTemplate(t.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={Colors.secondaryText} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Audit History</Text>
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
            <Ionicons name="clipboard-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>No audits yet</Text>
            <Text style={styles.emptyBody}>
              Create your first Layered Process Audit to start tracking readiness.
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {filtered.map((a) => (
              <AuditRow
                key={a.id}
                audit={a}
                onPress={() => navigation.navigate('AuditExecution', { auditId: a.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface AuditRowProps {
  audit: Audit;
  onPress: () => void;
}

function AuditRow({ audit, onPress }: AuditRowProps) {
  const done = audit.status === 'Completed';
  const color = done
    ? audit.passRate >= 80
      ? Colors.successGreen
      : Colors.amber
    : Colors.steelBlue;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.auditRow, pressed && { opacity: 0.92 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.auditName}>{audit.name}</Text>
        <Text style={styles.auditMeta}>
          {audit.layer} · {audit.standard} · {formatDate(audit.createdAt)}
        </Text>
      </View>
      <View style={[styles.auditBadge, { borderColor: color + '50', backgroundColor: color + '14' }]}>
        <Text style={[styles.auditBadgeText, { color }]}>
          {done ? `${audit.passRate}%` : 'In Progress'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  templateRow: {
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
  templateIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  templateMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
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
  auditRow: {
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
  auditName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  auditMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  auditBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  auditBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
