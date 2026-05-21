import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IronStratosWordmark } from '../components/IronStratosWordmark';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { tierColor, tierLabel } from '../utils/subscription';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'More'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface RowDef {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: keyof RootStackParamList;
}

const ROWS: RowDef[] = [
  {
    icon: 'document-text-outline',
    title: 'Reports',
    subtitle: 'Audit-ready PDF exports and one-pagers',
    route: 'Reports',
  },
  {
    icon: 'analytics-outline',
    title: 'Pareto Analysis',
    subtitle: 'Top recurring root causes',
    route: 'Pareto',
  },
  {
    icon: 'business-outline',
    title: 'By Department',
    subtitle: 'NCR breakdown per area',
    route: 'DepartmentBreakdown',
  },
  {
    icon: 'flash-outline',
    title: 'Action Tracker',
    subtitle: 'Every assignment across nonconformances',
    route: 'Actions',
  },
  {
    icon: 'newspaper-outline',
    title: 'One Pager Builder',
    subtitle: 'Executive summary card for leadership',
    route: 'OnePager',
  },
  {
    icon: 'search-outline',
    title: 'Search',
    subtitle: 'Find NCRs, audits, training, observations',
    route: 'Search',
  },
  {
    icon: 'people-outline',
    title: 'User Directory',
    subtitle: 'Shared team members for assignment',
    route: 'UserDirectory',
  },
  {
    icon: 'help-circle-outline',
    title: 'Help & FAQ',
    subtitle: 'How NConform works, by topic',
    route: 'HelpFAQ',
  },
  {
    icon: 'settings-outline',
    title: 'Settings',
    subtitle: 'Profile, subscription, integrations',
    route: 'Settings',
  },
];

export function MoreScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const tier = profile?.subscriptionTier ?? 'free';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="More" subtitle="Tools, exports, and settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.95 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.planEyebrow}>YOUR PLAN</Text>
            <Text style={styles.planName}>{tierLabel(tier)}</Text>
          </View>
          <View
            style={[
              styles.planBadge,
              { borderColor: tierColor(tier) + '60', backgroundColor: tierColor(tier) + '14' },
            ]}
          >
            <Text style={[styles.planBadgeText, { color: tierColor(tier) }]}>
              {tierLabel(tier)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
        </Pressable>

        <View style={styles.list}>
          {ROWS.map((row) => (
            <Pressable
              key={row.title}
              onPress={() => navigation.navigate(row.route as never)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon} size={20} color={Colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <IronStratosWordmark size="sm" />
          <Text style={styles.footerText}>IronStratos LLC · Smiths Station, Alabama</Text>
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
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.card,
  },
  planEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Colors.secondaryText,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.navy + '0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: 11,
    color: Colors.secondaryText,
    letterSpacing: 0.4,
  },
});
