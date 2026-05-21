import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { AssigneeField } from '../components/AssigneeField';
import { FormField } from '../components/FormField';
import { OptionSheet } from '../components/OptionSheet';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Spacing } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList } from '../navigation/types';
import {
  RecurrenceFrequency,
  ScheduledTraining,
  TrainingMaterial,
  TrainingRecord,
  TrainingRecurrence,
} from '../types';
import { formatDate, generateId, nowISO } from '../utils/ncrHelpers';
import {
  scheduleCertificationExpiryReminder,
  scheduleTrainingReminder,
} from '../utils/notifications';
import { nextRecurrenceDate } from '../utils/training';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingForm'>;

const RECUR_LABELS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'Yearly', label: 'Annually' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Custom', label: 'Custom interval' },
];

export function TrainingFormScreen({ navigation, route }: Props) {
  const { profile } = useProfile();
  const { records, templates, createRecord, updateRecord, saveScheduled } = useTraining();
  const editId = route.params?.recordId;
  const seedTemplateId = route.params?.templateId;
  const existing = useMemo(
    () => records.find((r) => r.id === editId) ?? null,
    [records, editId],
  );

  const [employeeName, setEmployeeName] = useState('');
  const [topic, setTopic] = useState('');
  const [standardRef, setStandardRef] = useState(profile?.standard || '');
  const [trainerName, setTrainerName] = useState('');
  const [dateCompleted, setDateCompleted] = useState<Date | null>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const [expiresOn, setExpiresOn] = useState<Date | null>(null);
  const [showExpires, setShowExpires] = useState(false);

  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<RecurrenceFrequency>('Yearly');
  const [recurInterval, setRecurInterval] = useState('180');
  const [openSheet, setOpenSheet] = useState<'recurrence' | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existing) {
      setEmployeeName(existing.employeeName);
      setTopic(existing.topic);
      setStandardRef(existing.standardRef);
      setTrainerName(existing.trainerName);
      setDateCompleted(existing.dateCompleted ? new Date(existing.dateCompleted) : null);
      setNotes(existing.notes);
      setPhoto(existing.photo);
      setMaterials(existing.materials);
      setExpiresOn(existing.certificationExpiresOn ? new Date(existing.certificationExpiresOn) : null);
      if (existing.recurrence) {
        setRecurEnabled(true);
        setRecurFrequency(existing.recurrence.frequency);
        setRecurInterval(String(existing.recurrence.customIntervalDays ?? 180));
      }
      return;
    }
    if (seedTemplateId) {
      const tpl = templates.find((t) => t.id === seedTemplateId);
      if (tpl) {
        setTopic(tpl.defaultTopic);
        setStandardRef(tpl.defaultStandardRef);
        if (tpl.defaultRecurrence) {
          setRecurEnabled(true);
          setRecurFrequency(tpl.defaultRecurrence.frequency);
          setRecurInterval(String(tpl.defaultRecurrence.customIntervalDays ?? 180));
        }
      }
    }
  }, [existing, seedTemplateId, templates]);

  const canSave = employeeName.trim().length > 0 && topic.trim().length > 0;

  const onChangeDate = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (selected) setDateCompleted(selected);
  };

  const onChangeExpires = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowExpires(false);
    if (selected) setExpiresOn(selected);
  };

  const addPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Gallery unavailable', 'Allow photo access to attach training evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (result.canceled) return;
    setPhoto(result.assets[0]?.uri ?? null);
  };

  const attachPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      setMaterials((m) => [
        ...m,
        {
          id: generateId('mat'),
          type: 'pdf',
          title: asset.name || 'Attached PDF',
          uri: asset.uri,
        },
      ]);
    } catch {
      Alert.alert('Could not attach PDF', 'Please try again.');
    }
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      Alert.alert('URL required', 'Paste a link to attach.');
      return;
    }
    setMaterials((m) => [
      ...m,
      {
        id: generateId('mat'),
        type: 'url',
        title: linkTitle.trim() || url,
        uri: url,
      },
    ]);
    setLinkUrl('');
    setLinkTitle('');
  };

  const removeMaterial = (id: string) => {
    setMaterials((m) => m.filter((x) => x.id !== id));
  };

  const openMaterial = (mat: TrainingMaterial) => {
    Linking.openURL(mat.uri).catch(() =>
      Alert.alert('Cannot open', 'The attachment is no longer available.'),
    );
  };

  const buildRecurrence = (): TrainingRecurrence | null => {
    if (!recurEnabled) return null;
    return {
      frequency: recurFrequency,
      customIntervalDays:
        recurFrequency === 'Custom'
          ? Math.max(1, parseInt(recurInterval, 10) || 180)
          : null,
    };
  };

  const scheduleFollowUp = async (record: TrainingRecord) => {
    const recurrence = record.recurrence;
    if (!recurrence) return;
    const baseDate = record.dateCompleted ? new Date(record.dateCompleted) : new Date();
    const nextDue = nextRecurrenceDate(recurrence, baseDate);
    const notificationId = await scheduleTrainingReminder({
      title: `Training due: ${record.topic}`,
      body: `${record.employeeName} — recurring per ${recurrence.frequency}`,
      date: new Date(Math.max(Date.now() + 60_000, nextDue.getTime() - 24 * 3600_000)),
    });
    const item: ScheduledTraining = {
      id: generateId('schT'),
      templateId: record.templateId,
      topic: record.topic,
      employeeName: record.employeeName,
      dueDate: nextDue.toISOString(),
      status: 'Upcoming',
      parentRecordId: record.id,
      notificationId,
      createdAt: nowISO(),
    };
    await saveScheduled(item);
  };

  const scheduleExpiry = async (record: TrainingRecord) => {
    if (!record.certificationExpiresOn) return;
    const expiry = new Date(record.certificationExpiresOn).getTime();
    const remindAt = new Date(Math.max(Date.now() + 60_000, expiry - 30 * 24 * 3600_000));
    await scheduleCertificationExpiryReminder({
      title: `Cert expires in 30 days: ${record.topic}`,
      body: `${record.employeeName} — ${record.standardRef || 'No standard ref'}`,
      date: remindAt,
    });
  };

  const onSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    try {
      const recurrence = buildRecurrence();
      const expiresIso = expiresOn ? expiresOn.toISOString() : null;
      if (existing) {
        const updated = await updateRecord(existing.id, {
          employeeName: employeeName.trim(),
          topic: topic.trim(),
          standardRef: standardRef.trim(),
          trainerName: trainerName.trim(),
          dateCompleted: dateCompleted ? dateCompleted.toISOString() : '',
          notes: notes.trim(),
          photo,
          materials,
          certificationExpiresOn: expiresIso,
          recurrence,
        });
        if (updated) {
          await scheduleExpiry(updated);
        }
      } else {
        const record: TrainingRecord = {
          id: generateId('trn'),
          employeeName: employeeName.trim(),
          topic: topic.trim(),
          standardRef: standardRef.trim(),
          trainerName: trainerName.trim(),
          dateCompleted: dateCompleted ? dateCompleted.toISOString() : '',
          notes: notes.trim(),
          photo,
          signOffStatement: null,
          signedAt: null,
          status: 'Pending',
          materials,
          certificationExpiresOn: expiresIso,
          recurrence,
          parentRecordId: null,
          parentNcrId: null,
          templateId: seedTemplateId ?? null,
          quiz: null,
          createdAt: nowISO(),
          isSampleData: false,
        };
        await createRecord(record);
        await scheduleExpiry(record);
        if (recurrence) await scheduleFollowUp(record);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title={existing ? 'Edit Training Record' : 'New Training Record'}
        subtitle="Document completed training"
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
          <FormField label="Employee Name" required>
            <TextInput
              style={styles.input}
              value={employeeName}
              onChangeText={setEmployeeName}
              placeholder="Employee being trained"
              placeholderTextColor={Colors.secondaryText}
            />
          </FormField>

          <FormField label="Training Topic" required>
            <TextInput
              style={styles.input}
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Control plan revision 4"
              placeholderTextColor={Colors.secondaryText}
            />
          </FormField>

          <FormField label="Standard / Procedure Reference" hint="Pre-filled from your profile">
            <TextInput
              style={styles.input}
              value={standardRef}
              onChangeText={setStandardRef}
              placeholder="e.g. ISO 9001 §7.2"
              placeholderTextColor={Colors.secondaryText}
            />
          </FormField>

          <FormField label="Trainer Name">
            <AssigneeField
              value={trainerName}
              onChange={setTrainerName}
              placeholder="Who delivered the training"
            />
          </FormField>

          <FormField label="Date Completed">
            <Pressable
              onPress={() => setShowDate(true)}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.dropdownText, !dateCompleted && { color: Colors.secondaryText }]}>
                {dateCompleted ? formatDate(dateCompleted.toISOString()) : 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.secondaryText} />
            </Pressable>
            {showDate ? (
              <DateTimePicker
                mode="date"
                value={dateCompleted ?? new Date()}
                onChange={onChangeDate}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            ) : null}
          </FormField>

          <FormField
            label="Certification Expires On"
            hint="If set, a 30-day reminder is scheduled automatically."
          >
            <Pressable
              onPress={() => setShowExpires(true)}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.dropdownText, !expiresOn && { color: Colors.secondaryText }]}>
                {expiresOn ? formatDate(expiresOn.toISOString()) : 'No expiration'}
              </Text>
              <View style={styles.dropdownIcons}>
                {expiresOn ? (
                  <Pressable onPress={() => setExpiresOn(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
                  </Pressable>
                ) : null}
                <Ionicons name="time-outline" size={18} color={Colors.secondaryText} />
              </View>
            </Pressable>
            {showExpires ? (
              <DateTimePicker
                mode="date"
                value={expiresOn ?? new Date()}
                onChange={onChangeExpires}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            ) : null}
          </FormField>

          <FormField label="Notes">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional details about the training"
              placeholderTextColor={Colors.secondaryText}
              multiline
              textAlignVertical="top"
            />
          </FormField>

          <FormField label="Photo Evidence" hint="Optional sign-in sheet or session photo">
            <Pressable
              onPress={addPhoto}
              style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="image-outline" size={18} color={Colors.steelBlue} />
              <Text style={styles.photoBtnLabel}>{photo ? 'Replace photo' : 'Attach photo'}</Text>
            </Pressable>
            {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}
          </FormField>

          <View style={styles.materialsCard}>
            <Text style={styles.cardTitle}>Training Material</Text>
            <Text style={styles.cardSub}>
              Attach PDFs or paste links to videos, SOPs, or LMS records.
            </Text>
            <View style={styles.materialActions}>
              <QuickActionButton
                label="Attach PDF"
                variant="outline"
                icon="document-attach-outline"
                onPress={attachPdf}
              />
            </View>
            <TextInput
              style={styles.input}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://"
              placeholderTextColor={Colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextInput
              style={styles.input}
              value={linkTitle}
              onChangeText={setLinkTitle}
              placeholder="Link title (optional)"
              placeholderTextColor={Colors.secondaryText}
            />
            <QuickActionButton
              label="Add Link"
              variant="ghost"
              icon="link-outline"
              onPress={addLink}
            />
            {materials.length > 0 ? (
              <View style={{ gap: 6, marginTop: Spacing.xs }}>
                {materials.map((mat) => (
                  <View key={mat.id} style={styles.materialRow}>
                    <Ionicons
                      name={mat.type === 'pdf' ? 'document-text-outline' : 'link-outline'}
                      size={16}
                      color={Colors.steelBlue}
                    />
                    <Pressable onPress={() => openMaterial(mat)} style={{ flex: 1 }}>
                      <Text style={styles.materialTitle} numberOfLines={1}>
                        {mat.title}
                      </Text>
                      <Text style={styles.materialUri} numberOfLines={1}>
                        {mat.uri}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => removeMaterial(mat.id)} hitSlop={6}>
                      <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.recurCard}>
            <View style={styles.recurHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Recurring requirement</Text>
                <Text style={styles.cardSub}>
                  Auto-creates a future training assignment when this one is signed off.
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
              <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
                <FormField label="Frequency">
                  <Pressable
                    onPress={() => setOpenSheet('recurrence')}
                    style={({ pressed }) => [
                      styles.input,
                      styles.dropdown,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.dropdownText}>
                      {RECUR_LABELS.find((r) => r.value === recurFrequency)?.label}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
                  </Pressable>
                </FormField>
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
              </View>
            ) : null}
          </View>

          <QuickActionButton
            label={submitting ? 'Saving…' : 'Save Training Record'}
            variant="primary"
            icon="save-outline"
            onPress={onSave}
            disabled={!canSave || submitting}
            fullWidth
          />

          {existing ? (
            <QuickActionButton
              label={existing.quiz ? 'Open Verification Quiz' : 'Add Verification Quiz'}
              variant="outline"
              icon="help-circle-outline"
              onPress={() => navigation.navigate('Quiz', { recordId: existing.id })}
              fullWidth
            />
          ) : null}

          {existing?.parentNcrId ? (
            <View style={styles.linkBack}>
              <Ionicons name="link-outline" size={14} color={Colors.steelBlue} />
              <Text style={styles.linkBackText}>
                Generated from NCR — open the NCR detail to see the original finding.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={openSheet === 'recurrence'}
        title="Recurrence"
        options={RECUR_LABELS.map((r) => r.label)}
        selected={RECUR_LABELS.find((r) => r.value === recurFrequency)?.label ?? null}
        onSelect={(label) => {
          const match = RECUR_LABELS.find((r) => r.label === label);
          if (match) setRecurFrequency(match.value);
        }}
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
    minHeight: 88,
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
  dropdownIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
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
  preview: {
    width: '100%',
    height: 180,
    borderRadius: Radii.button,
    backgroundColor: Colors.border,
    marginTop: Spacing.sm,
  },
  materialsCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recurCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  recurHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
    lineHeight: 17,
  },
  materialActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  materialTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  materialUri: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  linkBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.steelBlue + '10',
    borderRadius: Radii.button,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  linkBackText: {
    flex: 1,
    fontSize: 12,
    color: Colors.steelBlue,
    fontWeight: '600',
    lineHeight: 17,
  },
});
