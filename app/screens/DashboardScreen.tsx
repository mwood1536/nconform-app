import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { ChartFrame, ComparisonCard, MiniBarChart, MiniLineChart } from '../components/MiniCharts';
import { PatternsSection } from '../components/PatternsSection';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { UpsellCard } from '../components/UpsellCard';
import { Storage } from '../utils/storage';
import { IronStratosWordmark } from '../components/IronStratosWordmark';
import { NetworkStatusIcon } from '../components/NetworkStatusIcon';
import { MetricCard } from '../components/MetricCard';
import { NCRCard } from '../components/NCRCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { Colors, Shadow, Spacing } from '../constants/colors';
import { useAudits } from '../hooks/useAudits';
import { useNCRs } from '../hooks/useNCRs';
import { useProfile } from '../hooks/useProfile';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { greetingFor, isOverdue } from '../utils/ncrHelpers';
import { scheduleStatus } from '../utils/auditHelpers';
import { expiringBuckets } from '../utils/training';
import { entitlements } from '../core/EntitlementService';
import {
  activityAgeDays,
  ncrCountByWeek,
  openActionsTrend,
  passRateByWeek,
} from '../utils/trends';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const { ncrs, reload } = useNCRs();
  const { audits, scheduled, reload: reloadAudits } = useAudits();
  const { records: trainingRecords, reload: reloadTraining } = useTraining();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    void Storage.getTutorialCompleted().then((done) => {
      if (!done) setShowTutorial(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadAudits();
      void reloadTraining();
    }, [reload, reloadAudits, reloadTraining]),
  );

  const metrics = useMemo(() => {
    const open = ncrs.filter((n) => n.status !== 'Closed').length;
    const overdueActions = ncrs.reduce((acc, n) => {
      const overdueOnNCR = n.actions.filter(
        (a) => a.status !== 'Completed' && a.dueDate && new Date(a.dueDate).getTime() < Date.now(),
      ).length;
      const ncrOverdueBonus = isOverdue(n) ? 1 : 0;
      return acc + overdueOnNCR + ncrOverdueBonus;
    }, 0);
    // Pending audits = scheduled audits that are overdue OR upcoming (decision: overdue + upcoming).
    const pendingAudits = scheduled.filter((s) => {
      const st = scheduleStatus(s);
      return st === 'Overdue' || st === 'Upcoming';
    }).length;
    // Training expiring = expired + expiring within 30 days (decision: include both).
    const buckets = expiringBuckets(trainingRecords);
    const trainingExpiring = buckets.in30 + buckets.expired;
    // Awaiting approval = NCRs sitting in Submitted / Under Review.
    const awaitingNCRs = ncrs.filter(
      (n) =>
        n.approvalWorkflow?.status === 'Submitted' ||
        n.approvalWorkflow?.status === 'Under Review',
    );
    return {
      open,
      overdueActions,
      pendingAudits,
      trainingExpiring,
      awaitingApproval: awaitingNCRs.length,
      awaitingApprovalIds: awaitingNCRs.map((n) => n.id),
    };
  }, [ncrs, scheduled, trainingRecords]);

  const recent = ncrs.slice(0, 5);
  const greeting = greetingFor();
  const namePart = profile?.name ? `, ${profile.name}` : '';

  const isFreeTier = entitlements.adsEnabled();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>NConform</Text>
          <Text style={styles.greeting}>{`${greeting}${namePart}`}</Text>
        </View>
        <View style={styles.headerActions}>
          <NetworkStatusIcon />
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            accessibilityLabel="Search"
          >
            <Ionicons name="search-outline" size={22} color={Colors.navy} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.navy} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Open NCRs"
              value={metrics.open}
              accent={metrics.open > 0 ? 'amber' : 'neutral'}
              icon="clipboard-outline"
              onPress={() =>
                navigation.navigate('Main', {
                  screen: 'NCRs',
                  params: { initialStatus: 'Open' },
                })
              }
            />
            <MetricCard
              label="Overdue Actions"
              value={metrics.overdueActions}
              accent={metrics.overdueActions > 0 ? 'red' : 'neutral'}
              icon="alert-circle-outline"
              onPress={() => navigation.navigate('Actions', { initialFilter: 'Overdue' })}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Pending Audits"
              value={metrics.pendingAudits}
              accent={metrics.pendingAudits > 0 ? 'amber' : 'neutral'}
              icon="shield-checkmark-outline"
              onPress={() => navigation.navigate('AuditSchedule')}
            />
            <MetricCard
              label="Training Expiring"
              value={metrics.trainingExpiring}
              accent={metrics.trainingExpiring > 0 ? 'red' : 'neutral'}
              icon="time-outline"
              onPress={() =>
                navigation.navigate('Main', {
                  screen: 'Training',
                  params: { initialFilter: 'Expiring Soon' },
                })
              }
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Awaiting Approval"
              value={metrics.awaitingApproval}
              accent={metrics.awaitingApproval > 0 ? 'navy' : 'neutral'}
              icon="checkmark-done-outline"
              onPress={() =>
                navigation.navigate('Main', {
                  screen: 'NCRs',
                  params: {
                    filterIds: metrics.awaitingApprovalIds,
                    filterTitle: 'Awaiting Approval',
                  },
                })
              }
            />
            <View style={styles.metricSpacer} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>
          <View style={styles.trendGrid}>
            <ChartFrame
              title="NCRs Last 30 Days"
              subtitle="by week"
              hasData={ncrs.length > 0}
            >
              {(() => {
                const data = ncrCountByWeek(ncrs, 4);
                return <MiniBarChart values={data.values} labels={data.labels} />;
              })()}
            </ChartFrame>
            <ChartFrame
              title="Audit Pass Rate"
              subtitle="last 12 weeks"
              hasData={audits.filter((a) => a.status === 'Completed').length >= 2}
            >
              {(() => {
                const data = passRateByWeek(audits, 12);
                return <MiniLineChart values={data.values} yMax={100} />;
              })()}
            </ChartFrame>
            <ChartFrame
              title="Open Actions"
              hasData={ncrs.length > 0 && activityAgeDays(ncrs) >= 1}
            >
              {(() => {
                const t = openActionsTrend(ncrs);
                return (
                  <ComparisonCard
                    current={t.current}
                    previous={t.previous}
                    label="across all NCRs"
                  />
                );
              })()}
            </ChartFrame>
          </View>
        </View>

        <PatternsSection
          ncrs={ncrs}
          audits={audits}
          onSelectPattern={(p) =>
            navigation.navigate('Main', {
              screen: 'NCRs',
              params: {
                filterIds: p.relatedNcrIds,
                filterTitle: p.title,
              },
            })
          }
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.sectionLinks}>
              <Pressable onPress={() => navigation.navigate('Reports')}>
                <Text style={styles.sectionAction}>View Reports</Text>
              </Pressable>
              {ncrs.length > 0 ? (
                <Pressable onPress={() => navigation.navigate('Main', { screen: 'NCRs' })}>
                  <Text style={styles.sectionAction}>View all</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={28} color={Colors.secondaryText} />
              <Text style={styles.emptyTitle}>No nonconformances yet</Text>
              <Text style={styles.emptyBody}>
                When you log an NCR, it will appear here for quick reference.
              </Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recent.map((n) => (
                <NCRCard
                  key={n.id}
                  ncr={n}
                  compact
                  onPress={() => navigation.navigate('NCRDetail', { ncrId: n.id })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              label="Log NCR"
              variant="primary"
              icon="add-circle-outline"
              onPress={() => navigation.navigate('LogNCR')}
              fullWidth
            />
            <QuickActionButton
              label="Start Audit"
              variant="outline"
              icon="shield-checkmark-outline"
              onPress={() => navigation.navigate('AuditBuilder')}
              fullWidth
            />
            <QuickActionButton
              label="New Training"
              variant="ghost"
              icon="school-outline"
              onPress={() => navigation.navigate('TrainingForm')}
              fullWidth
            />
            <QuickActionButton
              label="Report Safety Observation"
              variant="amber"
              icon="shield-outline"
              onPress={() => navigation.navigate('SafetyObservation')}
              fullWidth
            />
          </View>
        </View>

        <UpsellCard
          visible={isFreeTier}
          onUpgrade={() => navigation.navigate('Settings')}
        />
        <AdBanner />

        <View style={styles.footerWordmark}>
          <IronStratosWordmark size="sm" />
        </View>
      </ScrollView>

      <TutorialOverlay
        visible={showTutorial}
        onDone={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  greeting: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  scrollContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl + 72,
  },
  metricsGrid: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricSpacer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.2,
    marginBottom: Spacing.md,
  },
  sectionLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.steelBlue,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  recentList: {
    gap: Spacing.md,
  },
  trendGrid: {
    gap: Spacing.md,
  },
  quickActions: {
    gap: Spacing.sm,
  },
  footerWordmark: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
