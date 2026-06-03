import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IronStratosWordmark } from '../components/IronStratosWordmark';
import { OptionSheet } from '../components/OptionSheet';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { QualityStandard, QualityStandards } from '../constants/standards';
import { useAudits } from '../hooks/useAudits';
import { useNCRs } from '../hooks/useNCRs';
import { useProfile } from '../hooks/useProfile';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList } from '../navigation/types';
import { SubscriptionTier } from '../types';
import { isOverdue } from '../utils/ncrHelpers';
import { applyNotificationPrefs } from '../utils/notifications';
import {
  DefaultNotificationPrefs,
  NotificationPrefs,
  Storage,
} from '../utils/storage';
import {
  EnterpriseURL,
  Pricing,
  PrivacyURL,
  TermsURL,
  tierColor,
  tierLabel,
} from '../utils/subscription';
import { entitlements } from '../core/EntitlementService';
import { effectiveTrainingStatus, expiringBuckets } from '../utils/training';
import { roleDescription, roleLabel, RoleOptions } from '../utils/permissions';
import { loadSampleData, removeSampleData } from '../utils/sampleData';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { profile, update, reset } = useProfile();
  const { ncrs } = useNCRs();
  const { audits } = useAudits();
  const { records } = useTraining();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [openSheet, setOpenSheet] = useState<'standard' | null>(null);
  const [notif, setNotif] = useState<NotificationPrefs>(DefaultNotificationPrefs);
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCompany(profile.company);
      setRole(profile.role);
    }
  }, [profile]);

  useEffect(() => {
    void Storage.getNotificationPrefs().then(setNotif);
  }, []);

  const alertCounts = useMemo(() => {
    const openNCRs = ncrs.filter((n) => n.status !== 'Closed').length;
    const overdueActions = ncrs.reduce((acc, n) => {
      const overdueOnNCR = n.actions.filter(
        (a) =>
          a.status !== 'Completed' &&
          a.dueDate &&
          new Date(a.dueDate).getTime() < Date.now(),
      ).length;
      return acc + overdueOnNCR + (isOverdue(n) ? 1 : 0);
    }, 0);
    const auditsInProgress = audits.filter((a) => a.status === 'In Progress').length;
    const overdueTraining = records.filter(
      (r) => effectiveTrainingStatus(r) === 'Overdue',
    ).length;
    const expiringCerts30 = expiringBuckets(records).in30;
    return { openNCRs, overdueActions, auditsInProgress, overdueTraining, expiringCerts30 };
  }, [ncrs, audits, records]);

  const persistNotif = useCallback(
    async (next: NotificationPrefs) => {
      setNotif(next);
      await Storage.setNotificationPrefs(next);
      await applyNotificationPrefs(next, alertCounts);
    },
    [alertCounts],
  );

  const onChangeReminderTime = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTime(false);
    if (selected) {
      void persistNotif({
        ...notif,
        dailyReminderHour: selected.getHours(),
        dailyReminderMinute: selected.getMinutes(),
      });
    }
  };

  const reminderTimeLabel = useMemo(() => {
    const d = new Date();
    d.setHours(notif.dailyReminderHour, notif.dailyReminderMinute, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }, [notif.dailyReminderHour, notif.dailyReminderMinute]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tier = profile.subscriptionTier;

  const onSaveProfile = async () => {
    await update({ name: name.trim(), company: company.trim(), role: role.trim() });
    Alert.alert('Saved', 'Your profile has been updated.');
  };

  const onChangeStandard = async (next: QualityStandard) => {
    await update({ standard: next });
  };

  const onUpgrade = (target: Extract<SubscriptionTier, 'pro' | 'bundle'>) => {
    const plan = Pricing[target];
    Alert.alert(
      target === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Bundle',
      `${plan.price} — ${plan.cadence}\n\n${plan.blurb}\n\nPurchases are processed securely through the app store.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            await update({ subscriptionTier: target });
          },
        },
      ],
    );
  };

  const onConnectRCA = () => {
    Alert.alert(
      'Root Cause AI Connection',
      profile.rcaConnected
        ? 'Disconnect this device from Root Cause AI?'
        : 'Link NConform with Root Cause AI to share NCRs across both apps using your Bundle account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: profile.rcaConnected ? 'Disconnect' : 'Connect',
          onPress: async () => {
            await update({ rcaConnected: !profile.rcaConnected });
          },
        },
      ],
    );
  };

  const onResetOnboarding = () => {
    Alert.alert(
      'Reset onboarding?',
      'This will sign you out of NConform on this device. Your NCRs will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await reset();
            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          },
        },
      ],
    );
  };

  const onWipeAll = () => {
    Alert.alert(
      'Erase all data?',
      'This permanently deletes every NCR, audit, training record, and your profile from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            await Storage.resetAll();
            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          },
        },
      ],
    );
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => undefined);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const badgeColor = tierColor(tier);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionCard title="Profile">
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.secondaryText}
              style={styles.input}
            />
          </Field>
          <Field label="Company">
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
              placeholderTextColor={Colors.secondaryText}
              style={styles.input}
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Quality Manager"
              placeholderTextColor={Colors.secondaryText}
              style={styles.input}
            />
          </Field>
          <QuickActionButton
            label="Save Profile"
            variant="primary"
            onPress={onSaveProfile}
            fullWidth
          />
        </SectionCard>

        <SectionCard title="Quality Standard">
          <Pressable
            onPress={() => setOpenSheet('standard')}
            style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
          >
            <Text
              style={[styles.dropdownText, !profile.standard && { color: Colors.secondaryText }]}
            >
              {profile.standard || 'Select your standard'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Notifications">
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Daily NCR review reminder</Text>
              <Text style={styles.toggleSub}>Remind me to review open NCRs.</Text>
            </View>
            <Switch
              value={notif.dailyReminderEnabled}
              onValueChange={(v) =>
                persistNotif({ ...notif, dailyReminderEnabled: v })
              }
              trackColor={{ false: Colors.border, true: Colors.steelBlue }}
              thumbColor={Colors.card}
            />
          </View>
          {notif.dailyReminderEnabled ? (
            <Pressable
              onPress={() => setShowTime(true)}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.dropdownText}>Reminder time · {reminderTimeLabel}</Text>
              <Ionicons name="time-outline" size={18} color={Colors.secondaryText} />
            </Pressable>
          ) : null}
          {showTime ? (
            <DateTimePicker
              mode="time"
              value={(() => {
                const d = new Date();
                d.setHours(notif.dailyReminderHour, notif.dailyReminderMinute, 0, 0);
                return d;
              })()}
              onChange={onChangeReminderTime}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          ) : null}

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Overdue action alerts</Text>
              <Text style={styles.toggleSub}>Alert me when actions pass their due date.</Text>
            </View>
            <Switch
              value={notif.overdueActionAlerts}
              onValueChange={(v) => persistNotif({ ...notif, overdueActionAlerts: v })}
              trackColor={{ false: Colors.border, true: Colors.steelBlue }}
              thumbColor={Colors.card}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Audit due alerts</Text>
              <Text style={styles.toggleSub}>Alert me about audits still in progress.</Text>
            </View>
            <Switch
              value={notif.auditDueAlerts}
              onValueChange={(v) => persistNotif({ ...notif, auditDueAlerts: v })}
              trackColor={{ false: Colors.border, true: Colors.steelBlue }}
              thumbColor={Colors.card}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Training overdue alerts</Text>
              <Text style={styles.toggleSub}>Alert me about training awaiting sign-off.</Text>
            </View>
            <Switch
              value={notif.trainingOverdueAlerts}
              onValueChange={(v) => persistNotif({ ...notif, trainingOverdueAlerts: v })}
              trackColor={{ false: Colors.border, true: Colors.steelBlue }}
              thumbColor={Colors.card}
            />
          </View>
        </SectionCard>

        <SectionCard title="Subscription">
          <View style={styles.tierRow}>
            <Text style={styles.tierLabel}>Current plan</Text>
            <View
              style={[
                styles.tierBadge,
                { borderColor: badgeColor + '60', backgroundColor: badgeColor + '12' },
              ]}
            >
              <Text style={[styles.tierBadgeText, { color: badgeColor }]}>
                {tierLabel(tier)}
              </Text>
            </View>
          </View>
          {tier !== 'pro' && tier !== 'bundle' ? (
            <QuickActionButton
              label={Pricing.pro.cta}
              variant="amber"
              icon="star-outline"
              onPress={() => onUpgrade('pro')}
              fullWidth
            />
          ) : null}
          {tier !== 'bundle' ? (
            <QuickActionButton
              label={Pricing.bundle.cta}
              variant="primary"
              icon="people-outline"
              onPress={() => onUpgrade('bundle')}
              fullWidth
            />
          ) : (
            <Text style={styles.note}>
              Bundle active — Root Cause AI + NConform, cloud sync, and team features unlocked.
            </Text>
          )}
          <Pressable
            onPress={() => openURL(EnterpriseURL)}
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.linkLabel}>Looking for enterprise pricing?</Text>
            <Ionicons name="open-outline" size={16} color={Colors.steelBlue} />
          </Pressable>
        </SectionCard>

        {entitlements.isBundleSync() ? (
          <SectionCard title="Root Cause AI Connection">
            <View style={styles.tierRow}>
              <Text style={styles.tierLabel}>Status</Text>
              <View
                style={[
                  styles.tierBadge,
                  {
                    borderColor:
                      (profile.rcaConnected ? Colors.successGreen : Colors.secondaryText) + '60',
                    backgroundColor:
                      (profile.rcaConnected ? Colors.successGreen : Colors.secondaryText) + '12',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tierBadgeText,
                    { color: profile.rcaConnected ? Colors.successGreen : Colors.secondaryText },
                  ]}
                >
                  {profile.rcaConnected ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
            </View>
            <Text style={styles.toggleSub}>
              Share NCRs between NConform and Root Cause AI using your Bundle account.
            </Text>
            <QuickActionButton
              label={profile.rcaConnected ? 'Manage Connection' : 'Connect Root Cause AI'}
              variant="outline"
              icon="git-network-outline"
              onPress={onConnectRCA}
              fullWidth
            />
          </SectionCard>
        ) : (
          <SectionCard title="Root Cause AI Connection">
            <Text style={styles.toggleSub}>
              Cross-app sync with Root Cause AI is available with Bundle.
            </Text>
          </SectionCard>
        )}

        <SectionCard title="Standards Library">
          <Pressable
            onPress={() => navigation.navigate('StandardsLibrary')}
            style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.navIcon}>
              <Ionicons name="library-outline" size={18} color={Colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Standards Reference</Text>
              <Text style={styles.navSub}>ISO 9001 · IATF 16949 · AS9100 · OSHA · ISO 14001 · ISO 45001 · FDA 21 CFR 820</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Departments">
          <Pressable
            onPress={() => navigation.navigate('ManageDepartments')}
            style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.navIcon}>
              <Ionicons name="business-outline" size={18} color={Colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Manage Departments</Text>
              <Text style={styles.navSub}>Add or remove custom labels for NCRs and audits.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Team">
          <Pressable
            onPress={() => navigation.navigate('UserDirectory')}
            style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.navIcon}>
              <Ionicons name="people-outline" size={18} color={Colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>User Directory</Text>
              <Text style={styles.navSub}>
                {tier === 'bundle'
                  ? 'Manage shared team members'
                  : 'Bundle feature — shared team roster'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
          </Pressable>
        </SectionCard>

        <SectionCard title="User Roles">
          <View style={styles.lockHeader}>
            <View style={styles.lockIcon}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.steelBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockTitle}>Available with Pro Web</Text>
              <Text style={styles.lockSub}>
                Solo and mobile-team accounts have full access by default. Role enforcement turns on
                when paired with a Pro Web workspace.
              </Text>
            </View>
          </View>
          {RoleOptions.map((role) => (
            <View key={role} style={styles.roleRow}>
              <View style={styles.roleHeader}>
                <Text style={styles.roleName}>{roleLabel(role)}</Text>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={Colors.secondaryText} />
                  <Text style={styles.lockBadgeText}>Locked</Text>
                </View>
              </View>
              <Text style={styles.roleDesc}>{roleDescription(role)}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => openURL(EnterpriseURL)}
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.linkLabel}>Role-based permissions available with Pro Web — Learn more</Text>
            <Ionicons name="open-outline" size={16} color={Colors.steelBlue} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Help">
          <Pressable
            onPress={() => navigation.navigate('HelpFAQ')}
            style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.navIcon}>
              <Ionicons name="help-circle-outline" size={18} color={Colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Help & FAQ</Text>
              <Text style={styles.navSub}>How NConform works, by topic. Email support inside.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
          </Pressable>
        </SectionCard>

        <SectionCard title="About NConform">
          <InfoRow label="Version" value={version} />
          <InfoRow label="Publisher" value="IronStratos LLC" />
          <Pressable
            onPress={() => openURL(PrivacyURL)}
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color={Colors.steelBlue} />
          </Pressable>
          <Pressable
            onPress={() => openURL(TermsURL)}
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.linkLabel}>Terms of Service</Text>
            <Ionicons name="open-outline" size={16} color={Colors.steelBlue} />
          </Pressable>
        </SectionCard>

        <SectionCard title="Data">
          <QuickActionButton
            label="Load Demo Data"
            variant="outline"
            icon="sparkles-outline"
            onPress={() => {
              Alert.alert(
                'Load demo data?',
                'Adds 8–10 sample NCRs, 3 audit templates, 2 audits, 5 training records, and 2 safety observations. Tagged DEMO for easy removal.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Load',
                    onPress: async () => {
                      await loadSampleData();
                      Alert.alert('Loaded', 'Demo data added. Look for DEMO badges.');
                    },
                  },
                ],
              );
            }}
            fullWidth
          />
          <QuickActionButton
            label="Remove Demo Data"
            variant="ghost"
            icon="trash-bin-outline"
            onPress={() => {
              Alert.alert(
                'Remove demo data?',
                'Only items tagged DEMO will be removed. Your real records are untouched.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      await removeSampleData();
                      Alert.alert('Removed', 'Demo data deleted.');
                    },
                  },
                ],
              );
            }}
            fullWidth
          />
          <QuickActionButton
            label="Replay Tutorial"
            variant="ghost"
            icon="play-circle-outline"
            onPress={async () => {
              await Storage.setTutorialCompleted(false);
              Alert.alert('Tutorial reset', 'The tour will replay next time you open Home.');
            }}
            fullWidth
          />
          <QuickActionButton
            label="Reset Onboarding"
            variant="ghost"
            icon="refresh-outline"
            onPress={onResetOnboarding}
            fullWidth
          />
          <Pressable
            onPress={onWipeAll}
            style={({ pressed }) => [styles.dangerLink, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.dangerLinkText}>Erase all NConform data</Text>
          </Pressable>
        </SectionCard>

        <View style={styles.footer}>
          <IronStratosWordmark size="sm" />
          <Text style={styles.footerText}>IronStratos LLC</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={openSheet === 'standard'}
        title="Quality Standard"
        options={QualityStandards}
        selected={profile.standard || null}
        onSelect={onChangeStandard}
        onClose={() => setOpenSheet(null)}
      />
    </SafeAreaView>
  );
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.secondaryText,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  cardBody: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.bodyText,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.bodyText,
    fontSize: 14,
    minHeight: 44,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.bodyText,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleTitle: {
    color: Colors.bodyText,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSub: {
    color: Colors.secondaryText,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tierLabel: {
    color: Colors.bodyText,
    fontSize: 14,
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.navy + '0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  navSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    color: Colors.secondaryText,
    fontSize: 13,
  },
  infoValue: {
    color: Colors.bodyText,
    fontSize: 13,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  linkLabel: {
    color: Colors.steelBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerLink: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  dangerLinkText: {
    color: Colors.errorRed,
    fontWeight: '600',
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: Colors.secondaryText,
    letterSpacing: 0.4,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  lockIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  lockSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
    lineHeight: 16,
  },
  roleRow: {
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  roleDesc: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 16,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.border,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
