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
import { Audit, AuditQuestion, AuditTemplate } from '../types';
import { generateId, nowISO } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'AuditBuilder'>;

function defaultStandard(profileStandard: string): AuditStandard {
  const match = AuditStandards.find((s) => profileStandard.includes(s));
  return match ?? 'ISO 9001';
}

export function AuditBuilderScreen({ navigation, route }: Props) {
  const { profile } = useProfile();
  const { templates, createAudit, saveTemplate } = useAudits();
  const seedTemplateId = route.params?.templateId;

  const [name, setName] = useState('');
  const [layer, setLayer] = useState<AuditLayer>(AuditLayers[0]);
  const [standard, setStandard] = useState<AuditStandard>(
    defaultStandard(profile?.standard ?? ''),
  );
  const [questions, setQuestions] = useState<AuditQuestion[]>([]);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftRequiresPhoto, setDraftRequiresPhoto] = useState(false);
  const [openSheet, setOpenSheet] = useState<'layer' | 'standard' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!seedTemplateId) return;
    const tpl = templates.find((t) => t.id === seedTemplateId);
    if (tpl) {
      setName(tpl.name);
      setLayer(tpl.layer);
      setStandard(tpl.standard);
      setQuestions(tpl.questions.map((q) => ({ ...q })));
    }
  }, [seedTemplateId, templates]);

  const canStart = useMemo(
    () => name.trim().length > 0 && questions.length > 0,
    [name, questions],
  );

  const addQuestion = () => {
    const prompt = draftPrompt.trim();
    if (!prompt) {
      Alert.alert('Question required', 'Enter a question prompt before adding it.');
      return;
    }
    setQuestions((q) => [
      ...q,
      { id: generateId('q'), prompt, requiresPhoto: draftRequiresPhoto },
    ]);
    setDraftPrompt('');
    setDraftRequiresPhoto(false);
  };

  const removeQuestion = (id: string) => {
    setQuestions((q) => q.filter((x) => x.id !== id));
  };

  const onSaveTemplate = async () => {
    if (!name.trim() || questions.length === 0) {
      Alert.alert('Incomplete', 'Add a name and at least one question to save a template.');
      return;
    }
    setBusy(true);
    try {
      const template: AuditTemplate = {
        id: generateId('tpl'),
        name: name.trim(),
        layer,
        standard,
        questions,
        createdAt: nowISO(),
      };
      await saveTemplate(template);
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
      const audit: Audit = {
        id: generateId('aud'),
        templateId: seedTemplateId ?? null,
        name: name.trim(),
        layer,
        standard,
        questions,
        responses: questions.map((q) => ({
          questionId: q.id,
          result: null,
          note: '',
          photo: null,
        })),
        passRate: 0,
        status: 'In Progress',
        assignedTo: profile?.name ?? '',
        createdAt: nowISO(),
        completedAt: null,
      };
      await createAudit(audit);
      navigation.replace('AuditExecution', { auditId: audit.id });
    } catch {
      Alert.alert('Could not start audit', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Build Audit"
        subtitle="Layered Process Audit"
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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

          <Text style={styles.sectionLabel}>Questions ({questions.length})</Text>
          {questions.length === 0 ? (
            <View style={styles.emptyQ}>
              <Ionicons name="help-circle-outline" size={22} color={Colors.secondaryText} />
              <Text style={styles.emptyQText}>
                Add questions one at a time. Each is answered Pass / Fail / N/A during the audit.
              </Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {questions.map((q, idx) => (
                <View key={q.id} style={styles.qRow}>
                  <Text style={styles.qIndex}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.qText}>{q.prompt}</Text>
                    {q.requiresPhoto ? (
                      <View style={styles.qPhotoTag}>
                        <Ionicons name="camera-outline" size={12} color={Colors.steelBlue} />
                        <Text style={styles.qPhotoTagText}>Photo required</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={() => removeQuestion(q.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={Colors.errorRed} />
                  </Pressable>
                </View>
              ))}
            </View>
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
            <View style={styles.photoToggleRow}>
              <Text style={styles.photoToggleLabel}>Require photo evidence</Text>
              <Switch
                value={draftRequiresPhoto}
                onValueChange={setDraftRequiresPhoto}
                trackColor={{ false: Colors.border, true: Colors.steelBlue }}
                thumbColor={Colors.card}
              />
            </View>
            <QuickActionButton
              label="Add Question"
              variant="outline"
              icon="add-outline"
              onPress={addQuestion}
              fullWidth
            />
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
  qPhotoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  qPhotoTagText: {
    fontSize: 11,
    color: Colors.steelBlue,
    fontWeight: '600',
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
});
