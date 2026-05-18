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
import { AuditResponse } from '../types';
import { nowISO } from '../utils/ncrHelpers';

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

function computePassRate(responses: AuditResponse[]): number {
  const scored = responses.filter((r) => r.result === 'Pass' || r.result === 'Fail');
  if (scored.length === 0) return 0;
  const passed = scored.filter((r) => r.result === 'Pass').length;
  return Math.round((passed / scored.length) * 100);
}

export function AuditExecutionScreen({ navigation, route }: Props) {
  const { auditId } = route.params;
  const { audits, reload, updateAudit } = useAudits();
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

  const working = responses ?? audit?.responses ?? [];

  const answered = working.filter((r) => r.result !== null).length;
  const total = audit?.questions.length ?? 0;
  const progress = total === 0 ? 0 : answered / total;
  const failedResponses = working.filter((r) => r.result === 'Fail');

  if (!audit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Audit" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.secondaryText} />
          <Text style={styles.missingText}>This audit could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mutate = (next: AuditResponse[]) => setResponses(next);

  const setResult = (questionId: string, result: AuditResponseType) => {
    mutate(
      working.map((r) =>
        r.questionId === questionId
          ? { ...r, result: r.result === result ? null : result }
          : r,
      ),
    );
  };

  const setNote = (questionId: string, note: string) => {
    mutate(working.map((r) => (r.questionId === questionId ? { ...r, note } : r)));
  };

  const capturePhoto = async (questionId: string) => {
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
    mutate(working.map((r) => (r.questionId === questionId ? { ...r, photo: uri } : r)));
  };

  const onComplete = async () => {
    if (answered < total) {
      Alert.alert(
        'Audit incomplete',
        `${total - answered} question${total - answered === 1 ? '' : 's'} still need a response.`,
      );
      return;
    }
    const rate = computePassRate(working);
    await updateAudit(audit.id, {
      responses: working,
      passRate: rate,
      status: 'Completed',
      completedAt: nowISO(),
    });
    setCompleted(true);
  };

  const onGenerateNCRs = async () => {
    if (failedResponses.length === 0) return;
    setGenerating(true);
    try {
      for (const r of failedResponses) {
        const q = audit.questions.find((x) => x.id === r.questionId);
        if (!q) continue;
        await createNCR({
          title: `LPA Finding — ${q.prompt.slice(0, 60)}`,
          detectionPoint: 'Internal Audit',
          severity: 'Medium',
          standardRef: standardRefFor(audit.standard),
          description:
            `Failed item from audit "${audit.name}" (${audit.layer}, ${audit.standard}).\n\n` +
            `Question: ${q.prompt}\n` +
            (r.note ? `Auditor note: ${r.note}` : 'No auditor note recorded.'),
          photos: r.photo ? [{ uri: r.photo, capturedAt: nowISO() }] : [],
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
    const rate = computePassRate(working);
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader
          title="Audit Complete"
          subtitle={audit.name}
          onBack={() => navigation.navigate('Main', { screen: 'Audits' })}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreEyebrow}>PASS RATE</Text>
            <Text
              style={[
                styles.scoreValue,
                { color: rate >= 80 ? Colors.successGreen : Colors.errorRed },
              ]}
            >
              {rate}%
            </Text>
            <Text style={styles.scoreMeta}>
              {working.filter((r) => r.result === 'Pass').length} passed ·{' '}
              {failedResponses.length} failed ·{' '}
              {working.filter((r) => r.result === 'N/A').length} N/A
            </Text>
          </View>

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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
          const r = working.find((x) => x.questionId === q.id);
          return (
            <View key={q.id} style={styles.qCard}>
              <Text style={styles.qNumber}>QUESTION {idx + 1}</Text>
              <Text style={styles.qPrompt}>{q.prompt}</Text>
              <View style={styles.resultRow}>
                {AuditResponseTypes.map((rt) => {
                  const active = r?.result === rt;
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

              {q.requiresPhoto || r?.photo ? (
                <View style={styles.photoBlock}>
                  {r?.photo ? (
                    <Image source={{ uri: r.photo }} style={styles.photo} />
                  ) : (
                    <Text style={styles.photoRequired}>Photo evidence required</Text>
                  )}
                  <Pressable
                    onPress={() => capturePhoto(q.id)}
                    style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="camera-outline" size={16} color={Colors.steelBlue} />
                    <Text style={styles.photoBtnLabel}>
                      {r?.photo ? 'Retake' : 'Capture'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <TextInput
                style={styles.note}
                value={r?.note ?? ''}
                onChangeText={(t) => setNote(q.id, t)}
                placeholder="Optional note…"
                placeholderTextColor={Colors.secondaryText}
                multiline
              />
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
  qNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
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
