import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpFAQ'>;

interface Section {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: { q: string; a: string }[];
}

const SECTIONS: Section[] = [
  {
    title: 'Getting Started',
    icon: 'rocket-outline',
    items: [
      {
        q: 'What is NConform?',
        a: 'NConform is an audit-ready quality system for logging nonconformances, running Layered Process Audits, and tracking training sign-offs. It runs entirely on your device and optionally syncs across a team with Bundle.',
      },
      {
        q: 'What is the basic workflow?',
        a: 'Log NCRs → Investigate with AI corrective action → Run audits → Auto-generate NCRs from failed audit items → Track training → Pareto and trends keep leadership informed.',
      },
    ],
  },
  {
    title: 'NCRs',
    icon: 'clipboard-outline',
    items: [
      {
        q: 'How do I log an NCR?',
        a: 'Tap Log NCR on the Dashboard or NCRs tab. Add title, detection point, severity, and a description. AI can suggest the right standard clause from your text.',
      },
      {
        q: 'How does the AI 8D writer work?',
        a: 'Open any NCR, tap Write Corrective Action with AI. Anthropic claude-sonnet-4-6 (via the IronStratos proxy) drafts problem statement, containment, root cause, corrective + preventive actions, standard reference, and verification method. You edit before saving.',
      },
      {
        q: 'What does the approval workflow do?',
        a: 'NCRs move Draft → Submitted → Under Review → Approved → Closed. Every transition is timestamped with the actor; comments thread on each NCR captures review discussion. Pro Web enforces role permissions on transitions.',
      },
    ],
  },
  {
    title: 'Audits',
    icon: 'shield-checkmark-outline',
    items: [
      {
        q: 'What is a Layered Process Audit (LPA)?',
        a: 'Short repeated audits at three layers (operator, supervisor, manager) on the same process. Layer 1 fails escalate to Layer 2 within 48 hours automatically; Layer 2 fails escalate to Layer 3 within 24 hours.',
      },
      {
        q: 'What is question randomization?',
        a: 'In a template, switch Question Selection to "Question Bank (Random)". The audit draws a fresh sample from the bank on every run, with a seed stored for traceability. Prevents memorized answers.',
      },
      {
        q: 'How does weighted scoring work?',
        a: 'Each question has a 1–5 weight. The audit summary shows both unweighted and weighted pass rates so critical items count more.',
      },
    ],
  },
  {
    title: 'Training',
    icon: 'school-outline',
    items: [
      {
        q: 'How do I document training?',
        a: 'Tap New Training Record on the Training tab. Capture employee, topic, trainer, date, optional photo, attached PDFs/links, and certification expiration. Recurring requirements auto-create the next assignment on sign-off.',
      },
      {
        q: 'What are training templates?',
        a: 'Prebuilt entries (Forklift, LOTO, Hazcom, etc.) plus custom templates pre-fill the form so logging takes seconds.',
      },
      {
        q: 'Can the AI quiz me?',
        a: 'Yes. After a record is saved, tap Add Verification Quiz to have AI generate 5 multiple-choice questions you can edit and assign. Pass threshold defaults to 80%.',
      },
    ],
  },
  {
    title: 'Standards',
    icon: 'library-outline',
    items: [
      {
        q: 'Which standards are supported?',
        a: 'ISO 9001 (quality), IATF 16949 (automotive), AS9100 (aerospace), OSHA (workplace safety), ISO 14001 (environmental), ISO 45001 (occupational health & safety), and FDA 21 CFR 820 (medical device).',
      },
      {
        q: 'Where do I find clause references?',
        a: 'Settings → Standards Library opens an offline reference with the most-used clauses for nonconformances and corrective actions.',
      },
    ],
  },
  {
    title: 'Subscription',
    icon: 'card-outline',
    items: [
      {
        q: 'What\'s the difference between tiers?',
        a: 'Free includes everything (AI features included) plus AdMob banners. Pro $4.99 one-time removes ads. Bundle $19.99/user/month adds multi-user cloud sync, shared User Directory, and Root Cause AI cross-app push. Pro Web $12K/year (sold direct) adds role-based permissions and web dashboards.',
      },
      {
        q: 'Are AI features really free?',
        a: 'Yes — AI corrective actions, audit template generation, pattern detection, training suggestions, and verification quizzes are available on every tier.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: 'construct-outline',
    items: [
      {
        q: 'AI isn\'t responding.',
        a: 'The AI proxy requires connectivity. If you\'re offline you\'ll see the offline banner; reconnect and retry. If you\'re online and still failing, contact support.',
      },
      {
        q: 'I see DEMO badges everywhere.',
        a: 'Onboarding loaded sample data. Settings → Data → Remove Demo Data wipes only items tagged DEMO.',
      },
      {
        q: 'Tab labels are cut off.',
        a: 'The bottom tab bar uses the device\'s safe insets dynamically. If you\'re seeing clipping, restart the app — it lets expo-navigation-bar reapply the system bar styling.',
      },
    ],
  },
  {
    title: 'Contact Support',
    icon: 'mail-outline',
    items: [
      {
        q: 'How do I reach support?',
        a: 'Email support@ironstratos.com — include your subscription tier and a brief description. We respond within one business day.',
      },
    ],
  },
];

export function HelpFAQScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Getting Started': true,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q),
      ),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Help & FAQ" onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.secondaryText} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search help"
          placeholderTextColor={Colors.secondaryText}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map((s) => {
          const open = expanded[s.title];
          return (
            <View key={s.title} style={styles.card}>
              <Pressable
                onPress={() => setExpanded((e) => ({ ...e, [s.title]: !open }))}
                style={({ pressed }) => [styles.head, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={s.icon} size={18} color={Colors.navy} />
                </View>
                <Text style={styles.headTitle}>{s.title}</Text>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.secondaryText}
                />
              </Pressable>
              {open ? (
                <View style={styles.body}>
                  {s.items.map((item) => (
                    <View key={item.q} style={styles.item}>
                      <Text style={styles.itemQ}>{item.q}</Text>
                      <Text style={styles.itemA}>{item.a}</Text>
                    </View>
                  ))}
                  {s.title === 'Contact Support' ? (
                    <Pressable
                      onPress={() =>
                        Linking.openURL('mailto:support@ironstratos.com').catch(() => undefined)
                      }
                      style={({ pressed }) => [styles.mailBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Ionicons name="mail" size={16} color={Colors.card} />
                      <Text style={styles.mailBtnText}>Email support@ironstratos.com</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={22} color={Colors.secondaryText} />
            <Text style={styles.emptyText}>No matching help articles.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrap: {
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.bodyText,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    overflow: 'hidden',
    ...Shadow.card,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.navy + '0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  item: {
    gap: 4,
  },
  itemQ: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  itemA: {
    fontSize: 13,
    color: Colors.bodyText,
    lineHeight: 19,
  },
  empty: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.secondaryText,
    fontSize: 13,
  },
  mailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radii.button,
    backgroundColor: Colors.navy,
  },
  mailBtnText: {
    color: Colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
});
