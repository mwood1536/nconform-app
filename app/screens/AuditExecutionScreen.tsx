import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { AuditResponseType, AuditResponseTypes, StandardReference } from '../constants/standards';
import { useAudits } from '../hooks/useAudits';
import { useNCRs } from '../hooks/useNCRs';
import { RootStackParamList } from '../navigation/types';
import { Audit, AuditResponse } from '../types';
import {
  computePassRates,
  emptyResponse,
  escalationHoursFor,
  followUpsSatisfied,
  layerLevelOf,
  nextLayerLabel,
} from '../utils/auditHelpers';
import { generateId, nowISO } from '../utils/ncrHelpers';
import { scheduleAuditReminder } from '../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'AuditExecution'>;

const RESULT_COLOR: Record<AuditResponseType, string> = {
  Pass: Colors.successGreen,
  Fail: Colors.errorRed,
  'N/A': Colors.secondaryText,
};

function standardRefFor(standard: string): StandardReference {
  if (standard.includes('IATF')) return 'IATF Requirement';
  if (standard.includes('AS9100')) return 'AS9100 Clause';
  if (standard.includes('ISO 9001')) return 'ISO 9001 Clause';
  return 'N/A';
}

export function AuditExecutionScreen({ navigation, route }: Props) {
  const { auditId } = route.params;
  const { audits, reload, updateAudit, createAudit, saveSchedule } = useAudits();
  const { createNCR } = useNCRs();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const audit = useMemo(() => audits.find((a) => a.id === auditId) ?? null, [audits, auditId]);
  const [responses, setResponses] = useState<AuditResponse[] | null>(null);
  const [completed, setCompleted] = useState(false);
  const [generating, setGenerating] = useState(false);

  const working: AuditResponse[] = responses ?? audit?.responses ?? [];

  const answered = working.filter((r) => r.result !== null).length;
  const total = audit?.questions.length ?? 0;
  const progress = total === 0 ? 0 : answered / total;
  const failedResponses = working.filter((r) => r.result === 'Fail');

  if (!audit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader title="Audit" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.secondaryText} />
          <Text style={styles.missingText}>This audit could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mutate = (next: AuditResponse[]) => setResponses(next);

  const ensureResponseList = (): AuditResponse[] => {
    if (responses) return responses;
    // Hydrate missing entries (older audits saved before follow-up fields existed).
    return audit.questions.map(
      (q) => audit.responses.find((r) => r.questionId === q.id) ?? emptyResponse(q.id),
    );
  };

  const setResult = (questionId: string, result: AuditResponseType) => {
    const base = ensureResponseList();
    mutate(
      base.map((r) =>
        r.questionId === questionId
          ? { ...r, result: r.result === result ? null : result }
          : r,
      ),
    );
  };

  const setNote = (questionId: string, note: string) => {
    const base = ensureResponseList();
    mutate(base.map((r) => (r.questionId === questionId ? { ...r, note } : r)));
  };

  const setFollowUpAnswer = (questionId: string, value: string) => {
    const base = ensureResponseList();
    mutate(
      base.map((r) => (r.questionId === questionId ? { ...r, followUpAnswer: value } : r)),
    );
  };

  const capturePhoto = async (questionId: string, target: 'primary' | 'followUp') => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera unavailable', 'Allow camera access to capture audit evidence.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri ?? null;
    const base = ensureResponseList();
    mutate(
      base.map((r) =>
        r.questionId === questionId
          ? target === 'primary'
            ? { ...r, photo: uri }
            : { ...r, followUpPhoto: uri }
          : r,
      ),
    );
  };

  const triggerEscalation = async (parent: Audit): Promise<Audit | null> => {
    const nextLayer = nextLayerLabel(parent.layer);
    if (!nextLayer) return null;
    const level = layerLevelOf(nextLayer);
    const hours = escalationHoursFor(level);
    const due = new Date(Date.now() + hours * 3600_000);

    const escalatedQuestions = parent.questions.map((q) => ({
      ...q,
      id: generateId('q'),
    }));
    const escalated: Audit = {
      id: generateId('aud'),
      templateId: parent.templateId,
      name: `Escalation: ${parent.name}`,
      layer: nextLayer,
      standard: parent.standard,
      questions: escalatedQuestions,
      responses: escalatedQuestions.map((q) => emptyResponse(q.id)),
      passRate: 0,
      weightedPassRate: 0,
      randomizationSeed: null,
      parentAuditId: parent.id,
      layerLevel: level,
      status: 'Scheduled',
      assignedTo: parent.assignedTo,
      createdAt: nowISO(),
      completedAt: null,
    };
    await createAudit(escalated);

    const notificationId = await scheduleAuditReminder({
      title: `${nextLayer} escalation triggered`,
      body: `${parent.name} failed — Layer ${level} audit due within ${hours}h.`,
      date: new Date(Date.now() + 30_000),
    });
    await saveSchedule({
      id: generateId('sch'),
      templateId: parent.templateId,
      name: escalated.name,
      layer: escalated.layer,
      standard: escalated.standard,
      assignedTo: escalated.assignedTo,
      dueDate: due.toISOString(),
      status: 'Upcoming',
      escalationParentAuditId: parent.id,
      notificationId,
      createdAt: nowISO(),
    });
    return escalated;
  };

  const onComplete = async () => {
    const base = ensureResponseList();
    if (answered < total) {
      Alert.alert(
        'Audit incomplete',
        `${total - answered} question${total - answered === 1 ? '' : 's'} still need a response.`,
      );
      return;
    }
    const followUpCheck = followUpsSatisfied(audit.questions, base);
    if (!followUpCheck.ok) {
      Alert.alert(
        'Follow-up required',
        `Complete the follow-up note or photo on:\n• ${followUpCheck.missingPrompts.join('\n• ')}`,
      );
      return;
    }
    const rates = computePassRates(audit.questions, base);
    const updated = await updateAudit(audit.id, {
      responses: base,
      passRate: rates.pass,
      weightedPassRate: rates.weighted,
      status: 'Completed',
      completedAt: nowISO(),
    });

    if (updated && updated.layerLevel < 3 && base.some((r) => r.result === 'Fail')) {
      const escalated = await triggerEscalation(updated);
      if (escalated) {
        Alert.alert(
          'Escalation triggered',
          `A ${escalated.layer} audit has been scheduled within ${escalationHoursFor(
            escalated.layerLevel,
          )} hours because of failed items.`,
        );
      }
    }

    setCompleted(true);
  };

  const onGenerateNCRs = async () => {
    if (failedResponses.length === 0) return;
    setGenerating(true);
    try {
      for (const r of failedResponses) {
        const q = audit.questions.find((x) => x.id === r.questionId);
        if (!q) continue;
        const photos = [
          ...(r.photo ? [{ uri: r.photo, capturedAt: nowISO() }] : []),
          ...(r.followUpPhoto ? [{ uri: r.followUpPhoto, capturedAt: nowISO() }] : []),
        ];
        await createNCR({
          title: `LPA Finding — ${q.prompt.slice(0, 60)}`,
          detectionPoint: 'Internal Audit',
          severity: q.weight >= 4 ? 'High' : 'Medium',
          standardRef: standardRefFor(audit.standard),
          description:
            `Failed item from audit "${audit.name}" (${audit.layer}, ${audit.standard}).\n\n` +
            `Question: ${q.prompt}\n` +
            (r.note ? `Auditor note: ${r.note}\n` : '') +
            (q.followUpOnFail && r.followUpAnswer
              ? `Follow-up (${q.followUpOnFail.prompt}): ${r.followUpAnswer}`
              : ''),
          photos,
          containmentAction: '',
          assignedTo: audit.assignedTo,
          dueDate: '',
        });
      }
      Alert.alert(
        'NCRs created',
        `${failedResponses.length} nonconformance${
          failedResponses.length === 1 ? '' : 's'
        } generated from failed items.`,
        [{ text: 'Done', onPress: () => navigation.navigate('Main', { screen: 'NCRs' }) }],
      );
    } catch {
      Alert.alert('Could not generate NCRs', 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (completed) {
    const rates = computePassRates(audit.questions, working);
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader
          title="Audit Complete"
          subtitle={audit.name}
          onBack={() => navigation.navigate('Main', { screen: 'Audits' })}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreEyebrow}>WEIGHTED PASS RATE</Text>
            <Text
              style={[
                styles.scoreValue,
                { color: rates.weighted >= 80 ? Colors.successGreen : Colors.errorRed },
              ]}
            >
              {rates.weighted}%
            </Text>
            <Text style={styles.scoreMeta}>
              Unweighted {rates.pass}% ·{' '}
              {working.filter((r) => r.result === 'Pass').length} pass ·{' '}
              {failedResponses.length} fail ·{' '}
              {working.filter((r) => r.result === 'N/A').length} N/A
            </Text>
          </View>

          {audit.parentAuditId ? (
            <View style={styles.chainCard}>
              <Ionicons name="git-branch-outline" size={16} color={Colors.steelBlue} />
              <Text style={styles.chainText}>
                Escalated from a prior audit. Chain visible in Audit History.
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Failed Items ({failedResponses.length})</Text>
          {failedResponses.length === 0 ? (
            <View style={styles.cleanCard}>
              <Ionicons name="checkmark-circle" size={26} color={Colors.successGreen} />
              <Text style={styles.cleanText}>No failed items. Clean audit.</Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {failedResponses.map((r) => {
                const q = audit.questions.find((x) => x.id === r.questionId);
                return (
                  <View key={r.questionId} style={styles.failRow}>
                    <Ionicons name="close-circle" size={18} color={Colors.errorRed} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.failText}>{q?.prompt}</Text>
                      {r.note ? <Text style={styles.failNote}>{r.note}</Text> : null}
                      {q?.followUpOnFail && r.followUpAnswer ? (
                        <Text style={styles.failNote}>Follow-up: {r.followUpAnswer}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {failedResponses.length > 0 ? (
            <QuickActionButton
              label={generating ? 'Generating…' : 'Generate NCR from failed items'}
              variant="amber"
              icon="construct-outline"
              onPress={onGenerateNCRs}
              disabled={generating}
              fullWidth
            />
          ) : null}
          <QuickActionButton
            label="Back to Audits"
            variant="primary"
            icon="checkmark-done-outline"
            onPress={() => navigation.navigate('Main', { screen: 'Audits' })}
            fullWidth
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title={audit.name} subtitle={audit.layer} onBack={() => navigation.goBack()} />
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {answered} of {total} answered
        </Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {audit.questions.map((q, idx) => {
            const r = working.find((x) => x.questionId === q.id) ?? emptyResponse(q.id);
            const showFollowUp = r.result === 'Fail' && q.followUpOnFail !== null;
            return (
              <View key={q.id} style={styles.qCard}>
                <View style={styles.qHeaderRow}>
                  <Text style={styles.qNumber}>QUESTION {idx + 1}</Text>
                  {q.weight > 1 ? (
                    <View style={styles.weightChip}>
                      <Ionicons name="barbell-outline" size={11} color={Colors.amber} />
                      <Text style={styles.weightChipText}>×{q.weight} weight</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.qPrompt}>{q.prompt}</Text>
                <View style={styles.resultRow}>
                  {AuditResponseTypes.map((rt) => {
                    const active = r.result === rt;
                    const color = RESULT_COLOR[rt];
                    return (
                      <Pressable
                        key={rt}
                        onPress={() => setResult(q.id, rt)}
                        style={({ pressed }) => [
                          styles.resultBtn,
                          {
                            backgroundColor: active ? color : Colors.card,
                            borderColor: active ? color : Colors.border,
                          },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.resultLabel,
                            { color: active ? Colors.card : color },
                          ]}
                        >
                          {rt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {q.requiresPhoto || r.photo ? (
                  <View style={styles.photoBlock}>
                    {r.photo ? (
                      <Image source={{ uri: r.photo }} style={styles.photo} />
                    ) : (
                      <Text style={styles.photoRequired}>Photo evidence required</Text>
                    )}
                    <Pressable
                      onPress={() => capturePhoto(q.id, 'primary')}
                      style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Ionicons name="camera-outline" size={16} color={Colors.steelBlue} />
                      <Text style={styles.photoBtnLabel}>{r.photo ? 'Retake' : 'Capture'}</Text>
                    </Pressable>
                  </View>
                ) : null}

                <TextInput
                  style={styles.note}
                  value={r.note}
                  onChangeText={(t) => setNote(q.id, t)}
                  placeholder="Optional note…"
                  placeholderTextColor={Colors.secondaryText}
                  multiline
                />

                {showFollowUp && q.followUpOnFail ? (
                  <View style={styles.followUpBlock}>
                    <View style={styles.followUpHeader}>
                      <Ionicons name="git-branch-outline" size={14} color={Colors.navy} />
                      <Text style={styles.followUpTitle}>Follow-up required</Text>
                    </View>
                    <Text style={styles.followUpPrompt}>{q.followUpOnFail.prompt}</Text>
                    <TextInput
                      style={[
                        styles.note,
                        q.followUpOnFail.requireNote && !r.followUpAnswer.trim() && styles.requiredField,
                      ]}
                      value={r.followUpAnswer}
                      onChangeText={(t) => setFollowUpAnswer(q.id, t)}
                      placeholder={
                        q.followUpOnFail.requireNote
                          ? 'Required response…'
                          : 'Follow-up response…'
                      }
                      placeholderTextColor={Colors.secondaryText}
                      multiline
                    />
                    {q.followUpOnFail.requirePhoto ? (
                      <View style={styles.photoBlock}>
                        {r.followUpPhoto ? (
                          <Image source={{ uri: r.followUpPhoto }} style={styles.photo} />
                        ) : (
                          <Text style={styles.photoRequired}>Follow-up photo required</Text>
                        )}
                        <Pressable
                          onPress={() => capturePhoto(q.id, 'followUp')}
                          style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Ionicons name="camera-outline" size={16} color={Colors.steelBlue} />
                          <Text style={styles.photoBtnLabel}>
                            {r.followUpPhoto ? 'Retake' : 'Capture'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}

          <QuickActionButton
            label="Complete Audit"
            variant="primary"
            icon="checkmark-circle-outline"
            onPress={onComplete}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  missingText: {
    color: Colors.secondaryText,
    fontSize: 14,
  },
  progressWrap: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.amber,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  qCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  qHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
  },
  weightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.amber + '18',
  },
  weightChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.amber,
  },
  qPrompt: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
    lineHeight: 21,
  },
  resultRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  resultBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoBlock: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: Radii.button,
    backgroundColor: Colors.border,
  },
  photoRequired: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: '600',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  photoBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.steelBlue,
  },
  note: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.bodyText,
    fontSize: 14,
    minHeight: 44,
    textAlignVertical: 'top',
    marginTop: Spacing.xs,
  },
  requiredField: {
    borderColor: Colors.amber,
  },
  followUpBlock: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.button,
    backgroundColor: Colors.navy + '08',
    gap: Spacing.xs,
  },
  followUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  followUpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  followUpPrompt: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 2,
  },
  scoreCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 4,
    ...Shadow.card,
  },
  scoreEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Colors.amber,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreMeta: {
    fontSize: 13,
    color: Colors.card + 'C0',
    fontWeight: '600',
    textAlign: 'center',
  },
  chainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.steelBlue + '10',
    borderRadius: Radii.button,
    padding: Spacing.md,
  },
  chainText: {
    flex: 1,
    fontSize: 12,
    color: Colors.steelBlue,
    fontWeight: '600',
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  cleanCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cleanText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
  },
  failRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.errorRed + '30',
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  failText: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '500',
  },
  failNote: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});
