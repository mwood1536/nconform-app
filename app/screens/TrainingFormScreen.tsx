import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
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
import { AssigneeField } from '../components/AssigneeField';
import { FormField } from '../components/FormField';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Spacing } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { useTraining } from '../hooks/useTraining';
import { RootStackParamList } from '../navigation/types';
import { TrainingRecord } from '../types';
import { formatDate, generateId, nowISO } from '../utils/ncrHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingForm'>;

export function TrainingFormScreen({ navigation, route }: Props) {
  const { profile } = useProfile();
  const { records, createRecord, updateRecord } = useTraining();
  const editId = route.params?.recordId;
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
    }
  }, [existing]);

  const canSave = employeeName.trim().length > 0 && topic.trim().length > 0;

  const onChangeDate = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (selected) setDateCompleted(selected);
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

  const onSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    try {
      if (existing) {
        await updateRecord(existing.id, {
          employeeName: employeeName.trim(),
          topic: topic.trim(),
          standardRef: standardRef.trim(),
          trainerName: trainerName.trim(),
          dateCompleted: dateCompleted ? dateCompleted.toISOString() : '',
          notes: notes.trim(),
          photo,
        });
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
          createdAt: nowISO(),
        };
        await createRecord(record);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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

          <QuickActionButton
            label={submitting ? 'Saving…' : 'Save Training Record'}
            variant="primary"
            icon="save-outline"
            onPress={onSave}
            disabled={!canSave || submitting}
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
});
