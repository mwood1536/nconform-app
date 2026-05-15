import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { TabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<TabParamList, 'Audits'>;

export function AuditsScreen(_props: Props) {
  const { profile } = useProfile();
  const standard = profile?.standard || 'Your standard';

  const upcoming: { title: string; date: string; type: string }[] = [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Audits" subtitle="Internal audits and external assessments" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>YOUR FRAMEWORK</Text>
              <Text style={styles.heroTitle}>{standard}</Text>
            </View>
          </View>
          <Text style={styles.heroBody}>
            NConform tracks your audit readiness against the standard you selected during onboarding.
            Track scheduled audits, capture findings, and convert them into NCRs without leaving the app.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Upcoming Audits</Text>
        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>No audits scheduled</Text>
            <Text style={styles.emptyBody}>
              Audit scheduling and finding-to-NCR conversion are part of the upcoming Audit Module
              release.
            </Text>
            <Pressable style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}>
              <Ionicons name="notifications-outline" size={14} color={Colors.steelBlue} />
              <Text style={styles.emptyCtaLabel}>Notify me when available</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Audit Trail</Text>
        <View style={styles.trailCard}>
          <Text style={styles.trailTitle}>Every change is auditable</Text>
          <Text style={styles.trailBody}>
            NConform records the full lifecycle of each NCR — created, contained, root-caused,
            corrective action issued, verified, and closed — with timestamps for audit review.
          </Text>
        </View>
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
  heroCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.amber + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    color: Colors.amber,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: Colors.card,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  heroBody: {
    color: Colors.card + 'C0',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
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
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.steelBlue + '14',
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
  },
  emptyCtaLabel: {
    color: Colors.steelBlue,
    fontSize: 12,
    fontWeight: '700',
  },
  trailCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: 6,
  },
  trailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  trailBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 19,
  },
});
