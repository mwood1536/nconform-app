import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { PrebuiltBank, PrebuiltBanks } from '../constants/questionBanks';
import { AuditLayers, AuditStandards } from '../constants/standards';
import { useAudits } from '../hooks/useAudits';
import { RootStackParamList } from '../navigation/types';
import { AuditQuestion, AuditTemplate } from '../types';
import { generateId, nowISO } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestionBank'>;

type Filter = 'All' | string;

export function QuestionBankLibraryScreen({ navigation }: Props) {
  const { saveTemplate } = useAudits();
  const [industry, setIndustry] = useState<Filter>('All');
  const [standard, setStandard] = useState<Filter>('All');
  const [auditType, setAuditType] = useState<Filter>('All');

  const industries = ['All', ...Array.from(new Set(PrebuiltBanks.map((b) => b.industry)))];
  const standards = ['All', ...Array.from(new Set(PrebuiltBanks.map((b) => b.standard)))];
  const auditTypes = ['All', ...Array.from(new Set(PrebuiltBanks.map((b) => b.auditType)))];

  const filtered = useMemo(
    () =>
      PrebuiltBanks.filter(
        (b) =>
          (industry === 'All' || b.industry === industry) &&
          (standard === 'All' || b.standard === standard) &&
          (auditType === 'All' || b.auditType === auditType),
      ),
    [industry, standard, auditType],
  );

  const onCopyBank = async (bank: PrebuiltBank) => {
    const questions: AuditQuestion[] = bank.questions.map((q) => ({
      id: generateId('q'),
      prompt: q,
      requiresPhoto: false,
      weight: 1,
      followUpOnFail: null,
    }));
    const layer = AuditLayers[0];
    const stdMatch =
      AuditStandards.find((s) => bank.standard.includes(s)) ?? AuditStandards[0];
    const template: AuditTemplate = {
      id: generateId('tpl'),
      name: `Copy of ${bank.name}`,
      layer,
      standard: stdMatch,
      mode: 'fixed',
      questions,
      questionBank: [],
      sampleSize: 10,
      recurrence: null,
      createdAt: nowISO(),
    };
    await saveTemplate(template);
    Alert.alert(
      'Template created',
      `"${template.name}" added to your templates. Open it from the Audits tab to edit.`,
      [
        { text: 'OK' },
        {
          text: 'Edit Now',
          onPress: () =>
            navigation.replace('AuditBuilder', { templateId: template.id }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Question Bank Library"
        subtitle="Prebuilt audit checklists"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FilterRow label="Industry" value={industry} options={industries} onChange={setIndustry} />
        <FilterRow label="Standard" value={standard} options={standards} onChange={setStandard} />
        <FilterRow label="Audit Type" value={auditType} options={auditTypes} onChange={setAuditType} />

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="library-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>No banks match these filters</Text>
            <Text style={styles.emptyBody}>Loosen one of the filters to see more banks.</Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {filtered.map((bank) => (
              <View key={bank.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardName}>{bank.name}</Text>
                  <Text style={styles.cardCount}>{bank.questions.length} Q</Text>
                </View>
                <View style={styles.tagRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{bank.industry}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{bank.standard}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{bank.auditType}</Text>
                  </View>
                </View>
                <View style={{ gap: 4, marginTop: Spacing.sm }}>
                  {bank.questions.slice(0, 3).map((q) => (
                    <Text key={q} style={styles.preview} numberOfLines={1}>
                      • {q}
                    </Text>
                  ))}
                  {bank.questions.length > 3 ? (
                    <Text style={styles.previewMore}>
                      +{bank.questions.length - 3} more questions
                    </Text>
                  ) : null}
                </View>
                <QuickActionButton
                  label="Copy to my templates"
                  variant="primary"
                  icon="duplicate-outline"
                  onPress={() => onCopyBank(bank)}
                  fullWidth
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface FilterRowProps {
  label: string;
  value: Filter;
  options: string[];
  onChange: (next: Filter) => void;
}

function FilterRow({ label, value, options, onChange }: FilterRowProps) {
  return (
    <View>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.pill,
              value === opt && styles.pillActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextActive]}>{opt}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
    gap: Spacing.sm,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  pillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 10,
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
  pillText: {
    color: Colors.bodyText,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
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
    padding: Spacing.lg,
    gap: 6,
    ...Shadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  cardCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.amber,
    backgroundColor: Colors.amber + '14',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.steelBlue + '14',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.steelBlue,
  },
  preview: {
    fontSize: 12,
    color: Colors.bodyText,
  },
  previewMore: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
