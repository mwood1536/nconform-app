import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OfflineBanner } from '../components/OfflineBanner';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SeverityBadge } from '../components/SeverityBadge';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useNCRs } from '../hooks/useNCRs';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { CorrectiveAction } from '../types';
import { generateCorrectiveAction } from '../utils/apiHelpers';
import { formatDate, generateId, nowISO } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'AICorrectiveAction'>;

interface DraftCA {
  problemStatement: string;
  containmentAction: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  standardReference: string;
  verificationMethod: string;
  responsibleParty: string;
  targetDate: string;
}

const SECTIONS: { key: keyof DraftCA; label: string; multiline: boolean; placeholder: string }[] = [
  { key: 'problemStatement', label: 'Problem Statement', multiline: true, placeholder: 'A clear statement of the nonconformance.' },
  { key: 'containmentAction', label: 'Immediate Containment Action', multiline: true, placeholder: 'Steps taken to immediately contain the issue.' },
  { key: 'rootCause', label: 'Root Cause', multiline: true, placeholder: 'The underlying root cause analysis.' },
  { key: 'correctiveAction', label: 'Corrective Action', multiline: true, placeholder: 'Actions to address the root cause.' },
  { key: 'preventiveAction', label: 'Preventive Action', multiline: true, placeholder: 'Actions to prevent recurrence.' },
  { key: 'standardReference', label: 'Standard Reference', multiline: false, placeholder: 'e.g. ISO 9001:2015 §10.2' },
  { key: 'verificationMethod', label: 'Verification Method', multiline: true, placeholder: 'How effectiveness will be verified.' },
  { key: 'responsibleParty', label: 'Responsible Party', multiline: false, placeholder: 'Owner of this corrective action' },
];

export function AICorrectiveActionScreen({ navigation, route }: Props) {
  const { ncrId } = route.params;
  const { ncrs, attachCorrectiveAction } = useNCRs();
  const { profile } = useProfile();
  const net = useNetworkStatus();
  const ncr = useMemo(() => ncrs.find((n) => n.id === ncrId) ?? null, [ncrs, ncrId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCA | null>(null);
  const [editing, setEditing] = useState<keyof DraftCA | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const pulse = useMemo(() => new Animated.Value(0.4), []);

  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, pulse]);

  const runGenerate = async () => {
    if (!ncr) return;
    setLoading(true);
    setError(null);
    try {
      const ai = await generateCorrectiveAction(ncr, profile?.standard ?? '');
      const targetDate = ncr.dueDate
        ? ncr.dueDate
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      setDraft({
        problemStatement: ai.problemStatement,
        containmentAction: ai.containmentAction || ncr.containmentAction,
        rootCause: ai.rootCause,
        correctiveAction: ai.correctiveAction,
        preventiveAction: ai.preventiveAction,
        standardReference: ai.standardReference,
        verificationMethod: ai.verificationMethod,
        responsibleParty: ncr.assignedTo,
        targetDate,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not generate the corrective action. Please try again.';
      setError(message);
      if (!draft && ncr) {
        setDraft({
          problemStatement: '',
          containmentAction: ncr.containmentAction,
          rootCause: '',
          correctiveAction: '',
          preventiveAction: '',
          standardReference: ncr.standardRef,
          verificationMethod: '',
          responsibleParty: ncr.assignedTo,
          targetDate: ncr.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ncr && !draft) {
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ncr]);

  // Offline queue: if generation failed while offline, retry automatically
  // the moment connectivity returns.
  useEffect(() => {
    if (net.justReconnected && ncr && !draft && !loading && error) {
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net.justReconnected]);

  if (!ncr) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader title="Corrective Action" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.secondaryText} />
          <Text style={styles.emptyText}>NCR could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const startManual = () => {
    setDraft({
      problemStatement: '',
      containmentAction: ncr.containmentAction,
      rootCause: '',
      correctiveAction: '',
      preventiveAction: '',
      standardReference: ncr.standardRef,
      verificationMethod: '',
      responsibleParty: ncr.assignedTo,
      targetDate: ncr.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setLoading(false);
    setError(null);
  };

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const ca: CorrectiveAction = {
        id: generateId('ca'),
        ncrId: ncr.id,
        problemStatement: draft.problemStatement,
        containmentAction: draft.containmentAction,
        rootCause: draft.rootCause,
        correctiveAction: draft.correctiveAction,
        preventiveAction: draft.preventiveAction,
        standardReference: draft.standardReference,
        verificationMethod: draft.verificationMethod,
        responsibleParty: draft.responsibleParty,
        targetDate: draft.targetDate,
        status: 'Submitted',
        createdAt: nowISO(),
      };
      await attachCorrectiveAction(ncr.id, ca);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onChangeTargetDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (selected && draft) setDraft({ ...draft, targetDate: selected.toISOString() });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="AI Corrective Action Writer"
        subtitle="Generating your corrective action report"
        onBack={() => navigation.goBack()}
      />
      <OfflineBanner />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.ncrTag}>{ncr.ncrNumber}</Text>
            <SeverityBadge severity={ncr.severity} small />
          </View>
          <Text style={styles.summaryTitle}>{ncr.title}</Text>
          <Text style={styles.summaryDesc} numberOfLines={4}>
            {ncr.description}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <View style={styles.pulseRow}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.pulseDot,
                    {
                      opacity: pulse,
                      transform: [
                        {
                          scale: pulse.interpolate({
                            inputRange: [0.4, 1],
                            outputRange: [0.8, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.loadingTitle}>Drafting your corrective action…</Text>
            <Text style={styles.loadingBody}>
              Pulling structure from {profile?.standard || 'your quality framework'} and the NCR
              details you logged.
            </Text>
            <ActivityIndicator color={Colors.navy} style={{ marginTop: Spacing.md }} />
          </View>
        ) : null}

        {error && !draft ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={Colors.errorRed} />
            <Text style={styles.errorTitle}>Unable to generate</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <View style={styles.errorActions}>
              <QuickActionButton label="Try Again" variant="primary" onPress={runGenerate} />
              <QuickActionButton label="Write Manually" variant="ghost" onPress={startManual} />
            </View>
          </View>
        ) : null}

        {draft && !loading
          ? SECTIONS.map((section) => (
              <SectionCard
                key={section.key}
                label={section.label}
                value={String(draft[section.key])}
                multiline={section.multiline}
                editing={editing === section.key}
                onStartEdit={() => setEditing(section.key)}
                onCommit={(value) => {
                  setDraft({ ...draft, [section.key]: value });
                  setEditing(null);
                }}
                placeholder={section.placeholder}
              />
            ))
          : null}

        {draft && !loading ? (
          <View style={styles.dateCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>Target Completion Date</Text>
              <Pressable onPress={() => setShowDate(true)} hitSlop={8}>
                <Ionicons name="create-outline" size={16} color={Colors.steelBlue} />
              </Pressable>
            </View>
            <Pressable onPress={() => setShowDate(true)}>
              <Text style={styles.dateValue}>
                {draft.targetDate ? formatDate(draft.targetDate) : 'Set a target date'}
              </Text>
            </Pressable>
            {showDate ? (
              <DateTimePicker
                mode="date"
                value={draft.targetDate ? new Date(draft.targetDate) : new Date()}
                onChange={onChangeTargetDate}
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            ) : null}
          </View>
        ) : null}

        {draft && !loading && error ? (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.amber} />
            <Text style={styles.warningText}>{error}</Text>
          </View>
        ) : null}

        {draft && !loading ? (
          <View style={styles.actionsCol}>
            <QuickActionButton
              label={saving ? 'Saving…' : 'Accept & Save'}
              variant="primary"
              icon="checkmark-circle-outline"
              onPress={onSave}
              disabled={saving}
              fullWidth
            />
            <QuickActionButton
              label="Regenerate"
              variant="ghost"
              icon="refresh-outline"
              onPress={runGenerate}
              disabled={saving || loading}
              fullWidth
            />
          </View>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface SectionCardProps {
  label: string;
  value: string;
  multiline: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (value: string) => void;
  placeholder: string;
}

function SectionCard({
  label,
  value,
  multiline,
  editing,
  onStartEdit,
  onCommit,
  placeholder,
}: SectionCardProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (editing) setDraftValue(value);
  }, [editing, value]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardLabel}>{label}</Text>
        {editing ? (
          <Pressable onPress={() => onCommit(draftValue)} hitSlop={8}>
            <Text style={styles.commitLink}>Done</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onStartEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={16} color={Colors.steelBlue} />
          </Pressable>
        )}
      </View>
      {editing ? (
        <TextInput
          value={draftValue}
          onChangeText={setDraftValue}
          multiline={multiline}
          autoFocus
          placeholder={placeholder}
          placeholderTextColor={Colors.secondaryText}
          style={[styles.cardInput, multiline && styles.cardInputMultiline]}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      ) : value ? (
        <Text style={styles.cardBody}>{value}</Text>
      ) : (
        <Text style={[styles.cardBody, { color: Colors.secondaryText, fontStyle: 'italic' }]}>
          {placeholder}
        </Text>
      )}
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.secondaryText,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: 6,
    ...Shadow.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ncrTag: {
    color: Colors.amber,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  summaryTitle: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryDesc: {
    color: Colors.card + 'C0',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  loadingWrap: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  pulseRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.navy,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  loadingBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.errorRed + '40',
    borderRadius: Radii.card,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  errorBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: 8,
    ...Shadow.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
  },
  commitLink: {
    color: Colors.steelBlue,
    fontWeight: '700',
    fontSize: 13,
  },
  cardBody: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 21,
  },
  cardInput: {
    fontSize: 14,
    color: Colors.bodyText,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    minHeight: 44,
  },
  cardInputMultiline: {
    minHeight: 100,
    paddingTop: 10,
  },
  dateCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: 8,
    ...Shadow.card,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.amber + '14',
    borderColor: Colors.amber + '40',
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  warningText: {
    color: Colors.amber,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  actionsCol: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
