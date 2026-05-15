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
import { OptionSheet } from '../components/OptionSheet';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import {
  QualityStandard,
  QualityStandards,
} from '../constants/standards';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { SubscriptionTier } from '../types';
import { Storage } from '../utils/storage';

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

  const onUpgrade = (tier: SubscriptionTier) => {
    Alert.alert(
      tier === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Team',
      tier === 'pro'
        ? 'Pro unlocks PDF exports, AI one-pagers, and an ad-free experience for $4.99 (one-time).'
        : 'Team adds shared workspaces and advanced reporting for $9.99/month.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate (demo)',
          onPress: async () => {
            await update({ subscriptionTier: tier });
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
      'This permanently deletes every NCR, corrective action, and your profile from this device.',
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

  const tier = profile.subscriptionTier;
  const tierLabel = tier === 'pro' ? 'Pro' : tier === 'team' ? 'Team' : 'Free';
  const tierColor =
    tier === 'pro' ? Colors.amber : tier === 'team' ? Colors.steelBlue : Colors.secondaryText;
  const version = Constants.expoConfig?.version ?? '1.0.0';

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
              style={[
                styles.dropdownText,
                !profile.standard && { color: Colors.secondaryText },
              ]}
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
              <Text style={styles.toggleSub}>
                Receive due-date and overdue notifications.
              </Text>
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
            <View style={[styles.tierBadge, { borderColor: tierColor + '60', backgroundColor: tierColor + '12' }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
            </View>
          </View>
          {tier !== 'pro' ? (
            <QuickActionButton
              label="Upgrade to Pro — $4.99"
              variant="amber"
              icon="star-outline"
              onPress={() => onUpgrade('pro')}
              fullWidth
            />
          ) : null}
          {tier !== 'team' ? (
            <QuickActionButton
              label="Upgrade to Team — $9.99/mo"
              variant="outline"
              icon="people-outline"
              onPress={() => onUpgrade('team')}
              fullWidth
            />
          ) : null}
        </SectionCard>

        <SectionCard title="About NConform">
          <InfoRow label="Version" value={version} />
          <InfoRow label="Publisher" value="IronStratos LLC" />
          <Pressable
            onPress={() => Linking.openURL('https://ironstratos.com/privacy').catch(() => undefined)}
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color={Colors.steelBlue} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://ironstratos.com/terms').catch(() => undefined)}
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
          <Pressable onPress={onWipeAll} style={({ pressed }) => [styles.dangerLink, pressed && { opacity: 0.85 }]}>
            <Text style={styles.dangerLinkText}>Erase all NConform data</Text>
          </Pressable>
        </SectionCard>
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
});
