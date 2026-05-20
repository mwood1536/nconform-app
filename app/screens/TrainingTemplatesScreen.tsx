import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList } from '../navigation/types';
import { RecurrenceFrequency, TrainingTemplate } from '../types';
import { generateId, nowISO } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingTemplates'>;

const RECUR_LABELS: { value: RecurrenceFrequency | 'none'; label: string }[] = [
  { value: 'none', label: 'No recurrence' },
  { value: 'Yearly', label: 'Annually' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Monthly', label: 'Monthly' },
];

export function TrainingTemplatesScreen({ navigation }: Props) {
  const { templates, saveTemplate, deleteTemplate } = useTraining();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [standardRef, setStandardRef] = useState('');
  const [duration, setDuration] = useState('60');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | 'none'>('Yearly');
  const [openSheet, setOpenSheet] = useState(false);

  const resetForm = () => {
    setName('');
    setTopic('');
    setStandardRef('');
    setDuration('60');
    setRecurrence('Yearly');
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the template a short name.');
      return;
    }
    const tpl: TrainingTemplate = {
      id: generateId('tpl'),
      name: name.trim(),
      defaultTopic: topic.trim() || name.trim(),
      defaultStandardRef: standardRef.trim(),
      defaultDurationMinutes: Math.max(0, parseInt(duration, 10) || 0),
      defaultRecurrence:
        recurrence === 'none'
          ? null
          : { frequency: recurrence, customIntervalDays: null },
      isBuiltIn: false,
      createdAt: nowISO(),
    };
    await saveTemplate(tpl);
    resetForm();
    setAdding(false);
  };

  const onRemove = (tpl: TrainingTemplate) => {
    if (tpl.isBuiltIn) {
      Alert.alert(
        'Prebuilt template',
        'Prebuilt templates can\'t be deleted. Duplicate to a custom template if you need changes.',
      );
      return;
    }
    Alert.alert('Delete template?', `Remove "${tpl.name}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(tpl.id) },
    ]);
  };

  const builtIns = templates.filter((t) => t.isBuiltIn);
  const customs = templates.filter((t) => !t.isBuiltIn);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Training Templates"
        subtitle="Prebuilt + custom training types"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <QuickActionButton
          label="New Custom Template"
          variant="amber"
          icon="add-circle-outline"
          onPress={() => setAdding(true)}
          fullWidth
        />

        {customs.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Custom · {customs.length}</Text>
            <View style={{ gap: Spacing.sm }}>
              {customs.map((t) => (
                <TemplateRow
                  key={t.id}
                  template={t}
                  onUse={() => navigation.navigate('TrainingForm', { templateId: t.id })}
                  onRemove={() => onRemove(t)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Prebuilt · {builtIns.length}</Text>
        <View style={{ gap: Spacing.sm }}>
          {builtIns.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onUse={() => navigation.navigate('TrainingForm', { templateId: t.id })}
              onRemove={() => onRemove(t)}
            />
          ))}
        </View>
      </ScrollView>

      <Modal visible={adding} animationType="slide" transparent onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView
          style={styles.modalFill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.backdrop} onPress={() => setAdding(false)}>
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>New Custom Template</Text>
              <FormField label="Template name" required>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Crane Operator Refresher"
                  placeholderTextColor={Colors.secondaryText}
                />
              </FormField>
              <FormField label="Default topic">
                <TextInput
                  style={styles.input}
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="Pre-fills the training topic"
                  placeholderTextColor={Colors.secondaryText}
                />
              </FormField>
              <FormField label="Standard reference">
                <TextInput
                  style={styles.input}
                  value={standardRef}
                  onChangeText={setStandardRef}
                  placeholder="e.g. OSHA 1910.179"
                  placeholderTextColor={Colors.secondaryText}
                />
              </FormField>
              <FormField label="Default duration (minutes)">
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={(t) => setDuration(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </FormField>
              <FormField label="Recurrence default">
                <Pressable
                  onPress={() => setOpenSheet(true)}
                  style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.dropdownText}>
                    {RECUR_LABELS.find((r) => r.value === recurrence)?.label}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
                </Pressable>
              </FormField>
              <View style={styles.sheetActions}>
                <QuickActionButton label="Cancel" variant="ghost" onPress={() => setAdding(false)} />
                <QuickActionButton label="Save" variant="primary" onPress={onSave} />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <OptionSheet
        visible={openSheet}
        title="Default recurrence"
        options={RECUR_LABELS.map((r) => r.label)}
        selected={RECUR_LABELS.find((r) => r.value === recurrence)?.label ?? null}
        onSelect={(label) => {
          const match = RECUR_LABELS.find((r) => r.label === label);
          if (match) setRecurrence(match.value);
        }}
        onClose={() => setOpenSheet(false)}
      />
    </SafeAreaView>
  );
}

interface TemplateRowProps {
  template: TrainingTemplate;
  onUse: () => void;
  onRemove: () => void;
}

function TemplateRow({ template, onUse, onRemove }: TemplateRowProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onUse} style={styles.rowMain}>
        <View style={styles.rowIcon}>
          <Ionicons name="bookmark-outline" size={16} color={Colors.steelBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{template.name}</Text>
          <Text style={styles.rowSub}>
            {template.defaultStandardRef || 'No standard ref'} ·{' '}
            {template.defaultDurationMinutes} min
            {template.defaultRecurrence ? ` · ${template.defaultRecurrence.frequency}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
      </Pressable>
      {template.isBuiltIn ? null : (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Ionicons name="trash-outline" size={16} color={Colors.secondaryText} />
        </Pressable>
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
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    ...Shadow.card,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.steelBlue + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  rowSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  removeBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
  },
  modalFill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#1B2A4AB3',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing.xs,
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
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.bodyText,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
