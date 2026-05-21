import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList } from '../navigation/types';
import { QuizQuestion, QuizResponse, TrainingQuiz } from '../types';
import { generateTrainingQuiz } from '../utils/apiHelpers';
import { generateId, nowISO } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

type Mode = 'generate' | 'edit' | 'take' | 'result';

const DEFAULT_THRESHOLD = 80;

export function QuizScreen({ navigation, route }: Props) {
  const { records, updateRecord } = useTraining();
  const record = useMemo(
    () => records.find((r) => r.id === route.params.recordId) ?? null,
    [records, route.params.recordId],
  );

  const [mode, setMode] = useState<Mode>(record?.quiz ? 'take' : 'generate');
  const [questions, setQuestions] = useState<QuizQuestion[]>(record?.quiz?.questions ?? []);
  const [responses, setResponses] = useState<QuizResponse[]>(record?.quiz?.responses ?? []);
  const [threshold, setThreshold] = useState(
    String(record?.quiz?.passThreshold ?? DEFAULT_THRESHOLD),
  );
  const [generating, setGenerating] = useState(false);

  if (!record) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader title="Quiz" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Ionicons name="alert-circle-outline" size={28} color={Colors.secondaryText} />
          <Text style={styles.missingText}>Training record not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onGenerate = async () => {
    setGenerating(true);
    try {
      const drafts = await generateTrainingQuiz(record.topic, record.standardRef, record.notes);
      if (drafts.length === 0) {
        Alert.alert('AI did not return questions', 'Try again or edit manually.');
      }
      const qs: QuizQuestion[] = drafts.map((d) => ({
        id: generateId('qz'),
        prompt: d.prompt,
        options: d.options,
        correctIndex: d.correctIndex,
      }));
      setQuestions(qs);
      setMode('edit');
    } catch (err) {
      Alert.alert(
        'Could not generate quiz',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestionPrompt = (id: string, text: string) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, prompt: text } : q)));
  };

  const updateOption = (qId: string, idx: number, text: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((o, i) => (i === idx ? text : o)),
            }
          : q,
      ),
    );
  };

  const setCorrect = (qId: string, idx: number) => {
    setQuestions((qs) =>
      qs.map((q) => (q.id === qId ? { ...q, correctIndex: idx } : q)),
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  };

  const onSaveAndStart = async () => {
    if (questions.length === 0) {
      Alert.alert('No questions', 'Add at least one question before starting.');
      return;
    }
    const quiz: TrainingQuiz = {
      questions,
      responses: [],
      takenAt: null,
      scorePercent: null,
      passThreshold: Math.min(100, Math.max(1, parseInt(threshold, 10) || DEFAULT_THRESHOLD)),
      passed: null,
    };
    await updateRecord(record.id, { quiz });
    setResponses([]);
    setMode('take');
  };

  const setResponse = (qId: string, idx: number) => {
    setResponses((rs) => {
      const existing = rs.find((r) => r.questionId === qId);
      if (existing) {
        return rs.map((r) => (r.questionId === qId ? { questionId: qId, selectedIndex: idx } : r));
      }
      return [...rs, { questionId: qId, selectedIndex: idx }];
    });
  };

  const onSubmitQuiz = async () => {
    if (responses.length < questions.length) {
      Alert.alert('Incomplete', 'Answer every question before submitting.');
      return;
    }
    const correct = questions.filter((q) => {
      const r = responses.find((x) => x.questionId === q.id);
      return r?.selectedIndex === q.correctIndex;
    }).length;
    const score = Math.round((correct / questions.length) * 100);
    const passThreshold = Math.min(100, Math.max(1, parseInt(threshold, 10) || DEFAULT_THRESHOLD));
    const passed = score >= passThreshold;
    const quiz: TrainingQuiz = {
      questions,
      responses,
      takenAt: nowISO(),
      scorePercent: score,
      passThreshold,
      passed,
    };
    await updateRecord(record.id, { quiz });
    setMode('result');
  };

  const onRetake = () => {
    setResponses([]);
    setMode('take');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Verification Quiz"
        subtitle={record.topic}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'generate' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Generate quiz with AI</Text>
              <Text style={styles.cardSub}>
                AI drafts 5 multiple-choice questions from the training topic, standard ref, and
                notes on this record. You can edit them before assigning.
              </Text>
              <QuickActionButton
                label={generating ? 'Generating…' : 'Generate Questions'}
                variant="amber"
                icon="sparkles-outline"
                onPress={onGenerate}
                disabled={generating}
                fullWidth
              />
              <QuickActionButton
                label="Skip — build manually"
                variant="ghost"
                icon="create-outline"
                onPress={() => {
                  setQuestions([
                    {
                      id: generateId('qz'),
                      prompt: 'New question',
                      options: ['Option A', 'Option B', 'Option C', 'Option D'],
                      correctIndex: 0,
                    },
                  ]);
                  setMode('edit');
                }}
                fullWidth
              />
            </View>
          ) : null}

          {mode === 'edit' ? (
            <>
              <Text style={styles.eyebrow}>Edit questions ({questions.length})</Text>
              {questions.map((q, idx) => (
                <View key={q.id} style={styles.qCard}>
                  <View style={styles.qHeader}>
                    <Text style={styles.qNumber}>Question {idx + 1}</Text>
                    <Pressable onPress={() => removeQuestion(q.id)} hitSlop={6}>
                      <Ionicons name="close-circle" size={18} color={Colors.errorRed} />
                    </Pressable>
                  </View>
                  <TextInput
                    value={q.prompt}
                    onChangeText={(t) => updateQuestionPrompt(q.id, t)}
                    style={[styles.input, styles.multiline]}
                    multiline
                    placeholder="Question prompt"
                    placeholderTextColor={Colors.secondaryText}
                  />
                  {q.options.map((opt, oi) => (
                    <View key={oi} style={styles.optRow}>
                      <Pressable
                        onPress={() => setCorrect(q.id, oi)}
                        hitSlop={6}
                        style={[
                          styles.radio,
                          q.correctIndex === oi && styles.radioActive,
                        ]}
                      >
                        {q.correctIndex === oi ? (
                          <Ionicons name="checkmark" size={14} color={Colors.card} />
                        ) : null}
                      </Pressable>
                      <TextInput
                        value={opt}
                        onChangeText={(t) => updateOption(q.id, oi, t)}
                        style={[styles.input, { flex: 1 }]}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        placeholderTextColor={Colors.secondaryText}
                      />
                    </View>
                  ))}
                </View>
              ))}
              <View style={styles.thresholdRow}>
                <Text style={styles.thresholdLabel}>Pass threshold %</Text>
                <TextInput
                  value={threshold}
                  onChangeText={(t) => setThreshold(t.replace(/[^0-9]/g, ''))}
                  style={[styles.input, { width: 70, textAlign: 'center' }]}
                  keyboardType="number-pad"
                />
              </View>
              <QuickActionButton
                label="Save Quiz & Take"
                variant="primary"
                icon="play-outline"
                onPress={onSaveAndStart}
                fullWidth
              />
            </>
          ) : null}

          {mode === 'take' ? (
            <>
              <Text style={styles.eyebrow}>
                Take the quiz ({questions.length} questions · pass {threshold}%)
              </Text>
              {questions.map((q, idx) => {
                const selected = responses.find((r) => r.questionId === q.id);
                return (
                  <View key={q.id} style={styles.qCard}>
                    <Text style={styles.qNumber}>Question {idx + 1}</Text>
                    <Text style={styles.qPrompt}>{q.prompt}</Text>
                    {q.options.map((opt, oi) => {
                      const active = selected?.selectedIndex === oi;
                      return (
                        <Pressable
                          key={oi}
                          onPress={() => setResponse(q.id, oi)}
                          style={({ pressed }) => [
                            styles.optChoice,
                            active && styles.optChoiceActive,
                            pressed && { opacity: 0.9 },
                          ]}
                        >
                          <View style={[styles.radio, active && styles.radioActive]}>
                            {active ? (
                              <Ionicons name="checkmark" size={14} color={Colors.card} />
                            ) : null}
                          </View>
                          <Text style={[styles.optText, active && styles.optTextActive]}>
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
              <QuickActionButton
                label="Submit Quiz"
                variant="primary"
                icon="send-outline"
                onPress={onSubmitQuiz}
                fullWidth
              />
              <QuickActionButton
                label="Edit Questions"
                variant="ghost"
                icon="create-outline"
                onPress={() => setMode('edit')}
                fullWidth
              />
            </>
          ) : null}

          {mode === 'result' && record.quiz ? (
            <View
              style={[
                styles.resultCard,
                {
                  borderColor:
                    record.quiz.passed === true
                      ? Colors.successGreen + '60'
                      : Colors.errorRed + '60',
                  backgroundColor:
                    record.quiz.passed === true
                      ? Colors.successGreen + '10'
                      : Colors.errorRed + '10',
                },
              ]}
            >
              <Ionicons
                name={record.quiz.passed ? 'checkmark-circle' : 'close-circle'}
                size={36}
                color={record.quiz.passed ? Colors.successGreen : Colors.errorRed}
              />
              <Text
                style={[
                  styles.resultScore,
                  {
                    color: record.quiz.passed ? Colors.successGreen : Colors.errorRed,
                  },
                ]}
              >
                {record.quiz.scorePercent}%
              </Text>
              <Text style={styles.resultLabel}>
                {record.quiz.passed
                  ? `Passed (threshold ${record.quiz.passThreshold}%)`
                  : `Below threshold (${record.quiz.passThreshold}%) — retake required`}
              </Text>
              {!record.quiz.passed ? (
                <QuickActionButton
                  label="Retake Quiz"
                  variant="amber"
                  icon="refresh-outline"
                  onPress={onRetake}
                  fullWidth
                />
              ) : null}
              <QuickActionButton
                label="Back to Training"
                variant="primary"
                icon="checkmark-done-outline"
                onPress={() => navigation.goBack()}
                fullWidth
              />
            </View>
          ) : null}
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
    gap: 6,
  },
  missingText: {
    color: Colors.secondaryText,
    fontSize: 13,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 17,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
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
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
  },
  qPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.bodyText,
    fontSize: 13,
    minHeight: 40,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: Colors.successGreen,
    borderColor: Colors.successGreen,
  },
  optChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  optChoiceActive: {
    borderColor: Colors.navy,
    backgroundColor: Colors.navy + '08',
  },
  optText: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
  },
  optTextActive: {
    color: Colors.navy,
    fontWeight: '700',
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.md,
  },
  thresholdLabel: {
    fontSize: 13,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultScore: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  resultLabel: {
    fontSize: 13,
    color: Colors.bodyText,
    textAlign: 'center',
  },
});
