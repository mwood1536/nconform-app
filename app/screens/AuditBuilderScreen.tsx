import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { FormField } from '../components/FormField';
import { OptionSheet } from '../components/OptionSheet';
import { OfflineBanner } from '../components/OfflineBanner';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import {
  AuditLayer,
  AuditLayers,
  AuditStandard,
  AuditStandards,
} from '../constants/standards';
import { useAudits } from '../hooks/useAudits';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import {
  Audit,
  AuditQuestion,
  AuditRecurrence,
  AuditTemplate,
  AuditTemplateMode,
  RecurrenceFrequency,
} from '../types';
import { generateAuditTemplateQuestions } from '../utils/apiHelpers';
import {
  emptyResponse,
  layerLevelOf,
  newRandomSeed,
  questionsForAudit,
} from '../utils/auditHelpers';
import { generateId, nowISO } from '../utils/ncrHelpers';
import { scheduleAuditReminder } from '../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'AuditBuilder'>;

const RECURRENCE_OPTIONS: RecurrenceFrequency[] = [
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Yearly',
  'Custom',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function defaultStandard(profileStandard: string): AuditStandard {
  const match = AuditStandards.find((s) => profileStandard.includes(s));
  return match ?? 'ISO 9001';
}

function nextDueDate(rec: AuditRecurrence): Date {
  const now = new Date();
  switch (rec.frequency) {
    case 'Daily':
      now.setDate(now.getDate() + 1);
      return now;
    case 'Weekly': {
      const target = rec.dayOfWeek ?? now.getDay();
      const diff = (target - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + diff);
      return now;
    }
    case 'Monthly': {
      const dom = rec.dayOfMonth ?? now.getDate();
      const next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(dom, 28));
      return next;
    }
    case 'Quarterly':
      now.setMonth(now.getMonth() + 3);
      return now;
    case 'Yearly':
      now.setFullYear(now.getFullYear() + 1);
      return now;
    case 'Custom':
      now.setDate(now.getDate() + (rec.customIntervalDays ?? 14));
      return now;
  }
}

export function AuditBuilderScreen({ navigation, route }: Props) {
  const { profile } = useProfile();
  const { templates, createAudit, saveTemplate, saveSchedule } = useAudits();
  const seedTemplateId = route.params?.templateId;

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [layer, setLayer] = useState<AuditLayer>(AuditLayers[0]);
  const [standard, setStandard] = useState<AuditStandard>(
    defaultStandard(profile?.standard ?? ''),
  );
  const [mode, setMode] = useState<AuditTemplateMode>('fixed');
  const [questions, setQuestions] = useState<AuditQuestion[]>([]);
  const [questionBank, setQuestionBank] = useState<AuditQuestion[]>([]);
  const [sampleSize, setSampleSize] = useState('10');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftRequiresPhoto, setDraftRequiresPhoto] = useState(false);
  const [draftWeight, setDraftWeight] = useState(1);
  const [draftFollowUp, setDraftFollowUp] = useState<{
    enabled: boolean;
    prompt: string;
    requirePhoto: boolean;
    requireNote: boolean;
  }>({ enabled: false, prompt: '', requirePhoto: false, requireNote: false });
  const [openSheet, setOpenSheet] = useState<
    'layer' | 'standard' | 'recurrence' | 'weekday' | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [aiScope, setAiScope] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<RecurrenceFrequency>('Weekly');
  const [recurDayOfWeek, setRecurDayOfWeek] = useState(1);
  const [recurDayOfMonth, setRecurDayOfMonth] = useState('1');
  const [recurInterval, setRecurInterval] = useState('14');
  const [recurReminder, setRecurReminder] = useState('24');
  const [recurAssignee, setRecurAssignee] = useState('');

  useEffect(() => {
    if (!seedTemplateId) return;
    const tpl = templates.find((t) => t.id === seedTemplateId);
    if (!tpl) return;
    setName(tpl.name);
    setLayer(tpl.layer);
    setStandard(tpl.standard);
    setMode(tpl.mode);
    setQuestions(tpl.questions.map((q) => ({ ...q })));
    setQuestionBank(tpl.questionBank.map((q) => ({ ...q })));
    setSampleSize(String(tpl.sampleSize));
    if (tpl.recurrence) {
      setRecurEnabled(true);
      setRecurFrequency(tpl.recurrence.frequency);
      setRecurDayOfWeek(tpl.recurrence.dayOfWeek ?? 1);
      setRecurDayOfMonth(String(tpl.recurrence.dayOfMonth ?? 1));
      setRecurInterval(String(tpl.recurrence.customIntervalDays ?? 14));
      setRecurReminder(String(tpl.recurrence.reminderHoursBefore));
      setRecurAssignee(tpl.recurrence.autoAssignedTo);
    }
  }, [seedTemplateId, templates]);

  const activeList = mode === 'random' ? questionBank : questions;
  const setActiveList = (next: AuditQuestion[]) => {
    if (mode === 'random') setQuestionBank(next);
    else setQuestions(next);
  };

  const onGenerateWithAI = async () => {
    const scope = aiScope.trim();
    if (!scope) {
      Alert.alert('Describe the audit', 'Tell the AI what you want to audit first.');
      return;
    }
    setGeneratingAI(true);
    try {
      const generated = await generateAuditTemplateQuestions(scope, layer, standard);
      if (generated.length === 0) {
        Alert.alert('No questions generated', 'Try a more specific description.');
        return;
      }
      const fresh: AuditQuestion[] = generated.map((prompt) => ({
        id: generateId('q'),
        prompt,
        requiresPhoto: false,
        weight: 1,
        followUpOnFail: null,
      }));
      setActiveList([...activeList, ...fresh]);
      if (!name.trim()) setName(scope.slice(0, 60));
      setAiScope('');
    } catch (err) {
      Alert.alert(
        'Could not generate template',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const canStart = useMemo(() => {
    if (name.trim().length === 0) return false;
    if (mode === 'fixed') return questions.length > 0;
    const size = parseInt(sampleSize, 10);
    return questionBank.length >= 1 && Number.isFinite(size) && size >= 1;
  }, [name, questions, questionBank, sampleSize, mode]);

  const addQuestion = () => {
    const prompt = draftPrompt.trim();
    if (!prompt) {
      Alert.alert('Question required', 'Enter a question prompt before adding it.');
      return;
    }
    const q: AuditQuestion = {
      id: generateId('q'),
      prompt,
      requiresPhoto: draftRequiresPhoto,
      weight: Math.min(5, Math.max(1, draftWeight)),
      followUpOnFail: draftFollowUp.enabled
        ? {
            prompt: draftFollowUp.prompt.trim() || 'Describe the failure',
            requirePhoto: draftFollowUp.requirePhoto,
            requireNote: draftFollowUp.requireNote,
          }
        : null,
    };
    setActiveList([...activeList, q]);
    setDraftPrompt('');
    setDraftRequiresPhoto(false);
    setDraftWeight(1);
    setDraftFollowUp({ enabled: false, prompt: '', requirePhoto: false, requireNote: false });
  };

  const removeQuestion = (id: string) => {
    setActiveList(activeList.filter((x) => x.id !== id));
  };

  const buildRecurrence = (): AuditRecurrence | null => {
    if (!recurEnabled) return null;
    const reminderH = Math.max(0, parseInt(recurReminder, 10) || 0);
    return {
      frequency: recurFrequency,
      dayOfWeek: recurFrequency === 'Weekly' ? recurDayOfWeek : null,
      dayOfMonth:
        recurFrequency === 'Monthly'
          ? Math.min(28, Math.max(1, parseInt(recurDayOfMonth, 10) || 1))
          : null,
      customIntervalDays:
        recurFrequency === 'Custom'
          ? Math.max(1, parseInt(recurInterval, 10) || 14)
          : null,
      reminderHoursBefore: reminderH,
      autoAssignedTo: recurAssignee.trim(),
    };
  };

  const onSaveTemplate = async () => {
    if (!name.trim()) {
      Alert.alert('Incomplete', 'Add a name before saving.');
      return;
    }
    if (mode === 'fixed' && questions.length === 0) {
      Alert.alert('Incomplete', 'Add at least one question before saving.');
      return;
    }
    if (mode === 'random' && questionBank.length === 0) {
      Alert.alert('Incomplete', 'Add at least one question to the bank.');
      return;
    }
    setBusy(true);
    try {
      const tplId = seedTemplateId ?? generateId('tpl');
      const recurrence = buildRecurrence();
      const template: AuditTemplate = {
        id: tplId,
        name: name.trim(),
        layer,
        standard,
        mode,
        questions: mode === 'fixed' ? questions : [],
        questionBank: mode === 'random' ? questionBank : [],
        sampleSize: Math.max(1, parseInt(sampleSize, 10) || 10),
        recurrence,
        createdAt: nowISO(),
      };
      await saveTemplate(template);

      if (recurrence) {
        const due = nextDueDate(recurrence);
        const remindAt = new Date(
          Math.max(Date.now() + 60_000, due.getTime() - recurrence.reminderHoursBefore * 3600_000),
        );
        const notificationId = await scheduleAuditReminder({
          title: `Audit due: ${template.name}`,
          body: `${template.layer} · ${template.standard}`,
          date: remindAt,
        });
        await saveSchedule({
          id: generateId('sch'),
          templateId: template.id,
          name: template.name,
          layer: template.layer,
          standard: template.standard,
          assignedTo: recurrence.autoAssignedTo,
          dueDate: due.toISOString(),
          status: 'Upcoming',
          escalationParentAuditId: null,
          notificationId,
          createdAt: nowISO(),
        });
      }

      Alert.alert('Template saved', `"${template.name}" is available for reuse.`);
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onStartAudit = async () => {
    if (!canStart) return;
    setBusy(true);
    try {
      let auditQuestions: AuditQuestion[] = questions;
      let seed: number | null = null;
      if (mode === 'random') {
        const drawn = questionsForAudit(
          {
            id: 'preview',
            name: name.trim(),
            layer,
            standard,
            mode: 'random',
            questions: [],
            questionBank,
            sampleSize: Math.max(1, parseInt(sampleSize, 10) || 10),
            recurrence: null,
            createdAt: nowISO(),
          },
          newRandomSeed(),
        );
        auditQuestions = drawn.questions;
        seed = drawn.seed;
      }
      const audit: Audit = {
        id: generateId('aud'),
        templateId: seedTemplateId ?? null,
        name: name.trim(),
        layer,
        standard,
        department: department.trim(),
        questions: auditQuestions,
        responses: auditQuestions.map((q) => emptyResponse(q.id)),
        passRate: 0,
        weightedPassRate: 0,
        randomizationSeed: seed,
        parentAuditId: null,
        layerLevel: layerLevelOf(layer),
        status: 'In Progress',
        assignedTo: profile?.name ?? '',
        generatedNcrIds: [],
        createdAt: nowISO(),
        completedAt: null,
        isSampleData: false,
      };
      await createAudit(audit);
      navigation.replace('AuditExecution', { auditId: audit.id });
    } catch {
      Alert.alert('Could not start audit', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const renderQuestion = (q: AuditQuestion, idx: number) => (
    <View key={q.id} style={styles.qRow}>
      <Text style={styles.qIndex}>{idx + 1}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.qText}>{q.prompt}</Text>
        <View style={styles.qMetaRow}>
          {q.weight > 1 ? (
            <View style={[styles.qTag, { backgroundColor: Colors.amber + '20' }]}>
              <Ionicons name="barbell-outline" size={11} color={Colors.amber} />
              <Text style={[styles.qTagText, { color: Colors.amber }]}>×{q.weight}</Text>
            </View>
          ) : null}
          {q.requiresPhoto ? (
            <View style={[styles.qTag, { backgroundColor: Colors.steelBlue + '14' }]}>
              <Ionicons name="camera-outline" size={11} color={Colors.steelBlue} />
              <Text style={[styles.qTagText, { color: Colors.steelBlue }]}>Photo</Text>
            </View>
          ) : null}
          {q.followUpOnFail ? (
            <View style={[styles.qTag, { backgroundColor: Colors.navy + '12' }]}>
              <Ionicons name="git-branch-outline" size={11} color={Colors.navy} />
              <Text style={[styles.qTagText, { color: Colors.navy }]}>If Fail →</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Pressable onPress={() => removeQuestion(q.id)} hitSlop={8}>
        <Ionicons name="close-circle" size={20} color={Colors.errorRed} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Build Audit"
        subtitle="Layered Process Audit"
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
          <FormField label="Audit Name" required>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Weld Cell LPA — Line 3"
              placeholderTextColor={Colors.secondaryText}
              maxLength={80}
            />
          </FormField>

          <FormField label="Department / Area" hint="Optional">
            <TextInput
              style={styles.input}
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g. Production, Weld Cell 3"
              placeholderTextColor={Colors.secondaryText}
            />
          </FormField>

          <FormField label="Audit Layer" required>
            <Pressable
              onPress={() => setOpenSheet('layer')}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.dropdownText}>{layer}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
            </Pressable>
          </FormField>

          <FormField label="Standard" required>
            <Pressable
              onPress={() => setOpenSheet('standard')}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.dropdownText}>{standard}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
            </Pressable>
          </FormField>

          <View style={styles.modeCard}>
            <Text style={styles.modeTitle}>Question Selection</Text>
            <Text style={styles.modeSub}>
              Random draws a fresh sample on every audit run — core LPA practice that prevents
              memorized answers.
            </Text>
            <View style={styles.modeRow}>
              <ModePill
                label="Fixed"
                active={mode === 'fixed'}
                onPress={() => setMode('fixed')}
              />
              <ModePill
                label="Question Bank (Random)"
                active={mode === 'random'}
                onPress={() => setMode('random')}
              />
            </View>
            {mode === 'random' ? (
              <View style={styles.sampleRow}>
                <Text style={styles.sampleLabel}>Sample size per audit</Text>
                <TextInput
                  style={[styles.input, styles.sampleInput]}
                  value={sampleSize}
                  onChangeText={(t) => setSampleSize(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={Colors.secondaryText}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={15} color={Colors.amber} />
              <Text style={styles.aiTitle}>Generate questions with AI</Text>
            </View>
            <Text style={styles.aiSub}>
              Describe what you want to audit — AI drafts 8–12 Pass / Fail / N/A questions added
              to your {mode === 'random' ? 'question bank' : 'audit'}.
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={aiScope}
              onChangeText={setAiScope}
              placeholder="e.g. Pre-shift safety check on the CNC machine area"
              placeholderTextColor={Colors.secondaryText}
              multiline
            />
            <QuickActionButton
              label={generatingAI ? 'Generating…' : 'Generate Questions'}
              variant="amber"
              icon="sparkles-outline"
              onPress={onGenerateWithAI}
              disabled={generatingAI}
              fullWidth
            />
            <QuickActionButton
              label="Browse Prebuilt Question Banks"
              variant="ghost"
              icon="library-outline"
              onPress={() => navigation.navigate('QuestionBank')}
              fullWidth
            />
          </View>

          <Text style={styles.sectionLabel}>
            {mode === 'random' ? 'Question Bank' : 'Questions'} ({activeList.length})
          </Text>
          {activeList.length === 0 ? (
            <View style={styles.emptyQ}>
              <Ionicons name="help-circle-outline" size={22} color={Colors.secondaryText} />
              <Text style={styles.emptyQText}>
                {mode === 'random'
                  ? 'Add 20–30 questions to the bank; the audit draws a fresh sample each run.'
                  : 'Add questions one at a time. Each is answered Pass / Fail / N/A during the audit.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>{activeList.map(renderQuestion)}</View>
          )}

          <View style={styles.addCard}>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={draftPrompt}
              onChangeText={setDraftPrompt}
              placeholder="New question prompt…"
              placeholderTextColor={Colors.secondaryText}
              multiline
            />
            <View style={styles.weightRow}>
              <Text style={styles.weightLabel}>Weight (1 = standard, 5 = critical)</Text>
              <View style={styles.weightControls}>
                {[1, 2, 3, 4, 5].map((w) => (
                  <Pressable
                    key={w}
                    onPress={() => setDraftWeight(w)}
                    style={({ pressed }) => [
                      styles.weightPill,
                      draftWeight === w && styles.weightPillActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weightPillText,
                        draftWeight === w && styles.weightPillTextActive,
                      ]}
                    >
                      ×{w}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.photoToggleRow}>
              <Text style={styles.photoToggleLabel}>Require photo evidence</Text>
              <Switch
                value={draftRequiresPhoto}
                onValueChange={setDraftRequiresPhoto}
                trackColor={{ false: Colors.border, true: Colors.steelBlue }}
                thumbColor={Colors.card}
              />
            </View>

            <View style={styles.followUpBlock}>
              <View style={styles.photoToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoToggleLabel}>Follow-up if Fail</Text>
                  <Text style={styles.followUpHint}>
                    Show a follow-up question when the response is Fail.
                  </Text>
                </View>
                <Switch
                  value={draftFollowUp.enabled}
                  onValueChange={(v) => setDraftFollowUp((f) => ({ ...f, enabled: v }))}
                  trackColor={{ false: Colors.border, true: Colors.steelBlue }}
                  thumbColor={Colors.card}
                />
              </View>
              {draftFollowUp.enabled ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={draftFollowUp.prompt}
                    onChangeText={(t) =>
                      setDraftFollowUp((f) => ({ ...f, prompt: t }))
                    }
                    placeholder="Follow-up prompt (e.g. What was the root cause?)"
                    placeholderTextColor={Colors.secondaryText}
                  />
                  <View style={styles.photoToggleRow}>
                    <Text style={styles.followUpHint}>Require photo on failure</Text>
                    <Switch
                      value={draftFollowUp.requirePhoto}
                      onValueChange={(v) =>
                        setDraftFollowUp((f) => ({ ...f, requirePhoto: v }))
                      }
                      trackColor={{ false: Colors.border, true: Colors.steelBlue }}
                      thumbColor={Colors.card}
                    />
                  </View>
                  <View style={styles.photoToggleRow}>
                    <Text style={styles.followUpHint}>Require note on failure</Text>
                    <Switch
                      value={draftFollowUp.requireNote}
                      onValueChange={(v) =>
                        setDraftFollowUp((f) => ({ ...f, requireNote: v }))
                      }
                      trackColor={{ false: Colors.border, true: Colors.steelBlue }}
                      thumbColor={Colors.card}
                    />
                  </View>
                </>
              ) : null}
            </View>

            <QuickActionButton
              label="Add Question"
              variant="outline"
              icon="add-outline"
              onPress={addQuestion}
              fullWidth
            />
          </View>

          <View style={styles.recurCard}>
            <View style={styles.photoToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeTitle}>Recurring schedule</Text>
                <Text style={styles.modeSub}>
                  Auto-creates upcoming audits and sends a local reminder ahead of each due date.
                </Text>
              </View>
              <Switch
                value={recurEnabled}
                onValueChange={setRecurEnabled}
                trackColor={{ false: Colors.border, true: Colors.steelBlue }}
                thumbColor={Colors.card}
              />
            </View>
            {recurEnabled ? (
              <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                <FormField label="Frequency">
                  <Pressable
                    onPress={() => setOpenSheet('recurrence')}
                    style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.dropdownText}>{recurFrequency}</Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
                  </Pressable>
                </FormField>
                {recurFrequency === 'Weekly' ? (
                  <FormField label="Day of week">
                    <Pressable
                      onPress={() => setOpenSheet('weekday')}
                      style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.dropdownText}>{WEEKDAYS[recurDayOfWeek]}</Text>
                      <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
                    </Pressable>
                  </FormField>
                ) : null}
                {recurFrequency === 'Monthly' ? (
                  <FormField label="Day of month (1–28)">
                    <TextInput
                      style={styles.input}
                      value={recurDayOfMonth}
                      onChangeText={(t) => setRecurDayOfMonth(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                    />
                  </FormField>
                ) : null}
                {recurFrequency === 'Custom' ? (
                  <FormField label="Every N days">
                    <TextInput
                      style={styles.input}
                      value={recurInterval}
                      onChangeText={(t) => setRecurInterval(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                    />
                  </FormField>
                ) : null}
                <FormField label="Reminder hours before due">
                  <TextInput
                    style={styles.input}
                    value={recurReminder}
                    onChangeText={(t) => setRecurReminder(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                  />
                </FormField>
                <FormField label="Auto-assign to (optional)">
                  <TextInput
                    style={styles.input}
                    value={recurAssignee}
                    onChangeText={setRecurAssignee}
                    placeholder="Defaults to whoever runs the audit"
                    placeholderTextColor={Colors.secondaryText}
                  />
                </FormField>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <QuickActionButton
              label="Save as Template"
              variant="ghost"
              icon="bookmark-outline"
              onPress={onSaveTemplate}
              disabled={busy}
              fullWidth
            />
            <QuickActionButton
              label={busy ? 'Starting…' : 'Start Audit'}
              variant="amber"
              icon="play-outline"
              onPress={onStartAudit}
              disabled={!canStart || busy}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={openSheet === 'layer'}
        title="Audit Layer"
        options={AuditLayers}
        selected={layer}
        onSelect={setLayer}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'standard'}
        title="Standard"
        options={AuditStandards}
        selected={standard}
        onSelect={setStandard}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'recurrence'}
        title="Frequency"
        options={RECURRENCE_OPTIONS}
        selected={recurFrequency}
        onSelect={(v) => setRecurFrequency(v)}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'weekday'}
        title="Day of Week"
        options={WEEKDAYS}
        selected={WEEKDAYS[recurDayOfWeek]}
        onSelect={(v) => setRecurDayOfWeek(WEEKDAYS.indexOf(v))}
        onClose={() => setOpenSheet(null)}
      />
    </SafeAreaView>
  );
}

interface ModePillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ModePill({ label, active, onPress }: ModePillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modePill,
        active && styles.modePillActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.modePillText, active && styles.modePillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    color: Colors.bodyText,
    fontSize: 14,
    minHeight: 44,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyQ: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  emptyQText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  qIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.navy,
    color: Colors.card,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  qText: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '500',
  },
  qMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  qTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  qTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  aiCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.amber + '50',
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  aiSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 17,
  },
  photoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoToggleLabel: {
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  modeCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  modeSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 17,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  modePillText: {
    color: Colors.bodyText,
    fontSize: 13,
    fontWeight: '600',
  },
  modePillTextActive: {
    color: Colors.card,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sampleLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  sampleInput: {
    width: 70,
    textAlign: 'center',
  },
  weightRow: {
    gap: Spacing.xs,
  },
  weightLabel: {
    fontSize: 13,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  weightControls: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  weightPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  weightPillActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amber,
  },
  weightPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.bodyText,
  },
  weightPillTextActive: {
    color: Colors.card,
  },
  followUpBlock: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  followUpHint: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 16,
  },
  recurCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
});
