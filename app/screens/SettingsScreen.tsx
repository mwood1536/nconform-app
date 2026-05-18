import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
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
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { SubscriptionTier } from '../types';
import { Storage } from '../utils/storage';
import {
  EnterpriseURL,
  Pricing,
  PrivacyURL,
  TermsURL,
  tierColor,
  tierLabel,
} from '../utils/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { profile, update, reset } = useProfile();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [openSheet, setOpenSheet] = useState<'standard' | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCompany(profile.company);
      setRole(profile.role);
    }
  }, [profile]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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

  const onToggleNotifications = async (value: boolean) => {
    await update({ notificationsEnabled: value });
  };

  const onUpgrade = (target: Extract<SubscriptionTier, 'pro' | 'bundle'>) => {
    const plan = Pricing[target];
    Alert.alert(
      target === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Bundle',
      `${plan.price} — ${plan.cadence}\n\n${plan.blurb}\n\nBilling is handled in-app via RevenueCat (native configuration pending). Use demo activation to preview.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate (demo)',
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
        ? 'This device is linked to Root Cause AI (demo). Disconnect?'
        : 'Cross-app linking with Root Cause AI is coming with the Bundle cloud workspace. Enable a demo connection for now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: profile.rcaConnected ? 'Disconnect' : 'Enable (demo)',
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
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
              <Text style={styles.toggleTitle}>Reminders & alerts</Text>
              <Text style={styles.toggleSub}>Receive due-date and overdue notifications.</Text>
            </View>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={onToggleNotifications}
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

        <SectionCard title="Root Cause AI Connection">
          <View style={styles.tierRow}>
            <Text style={styles.tierLabel}>Status</Text>
            <View
              style={[
                styles.tierBadge,
                {
                  borderColor: (profile.rcaConnected ? Colors.successGreen : Colors.secondaryText) + '60',
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
            Link NConform with Root Cause AI to share NCRs across both apps. Cross-app sync
            arrives with the Bundle cloud workspace.
          </Text>
          <QuickActionButton
            label={profile.rcaConnected ? 'Manage Connection' : 'Connect Root Cause AI'}
            variant="outline"
            icon="git-network-outline"
            onPress={onConnectRCA}
            fullWidth
          />
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

        <SectionCard title="About NConform">
          <InfoRow label="Version" value={version} />
          <InfoRow label="Publisher" value="IronStratos LLC" />
          <InfoRow label="Location" value="Smiths Station, Alabama" />
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
          <Text style={styles.footerText}>IronStratos LLC · Smiths Station, Alabama</Text>
        </View>
      </ScrollView>

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
});
