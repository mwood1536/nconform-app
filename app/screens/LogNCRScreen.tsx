import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
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
import { FormField } from '../components/FormField';
import { OptionSheet } from '../components/OptionSheet';
import { QuickActionButton } from '../components/QuickActionButton';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import {
  DetectionPoint,
  DetectionPoints,
  Severities,
  Severity,
  StandardReference,
  StandardReferences,
} from '../constants/standards';
import { useNCRs } from '../hooks/useNCRs';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { NCRPhoto } from '../types';
import { StandardSuggestion, suggestStandards } from '../utils/apiHelpers';
import { allDepartments } from '../utils/departments';
import { formatDate, nowISO, severityColor } from '../utils/ncrHelpers';

function mapToStandardRef(text: string): StandardReference | null {
  if (text.includes('IATF')) return 'IATF Requirement';
  if (text.includes('AS9100')) return 'AS9100 Clause';
  if (text.includes('ISO 9001')) return 'ISO 9001 Clause';
  return null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'LogNCR'>;

export function LogNCRScreen({ navigation }: Props) {
  const { createNCR } = useNCRs();
  const { profile } = useProfile();
  const [title, setTitle] = useState('');
  const [detectionPoint, setDetectionPoint] = useState<DetectionPoint | null>(null);
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [standardRef, setStandardRef] = useState<StandardReference | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<NCRPhoto[]>([]);
  const [containmentAction, setContainmentAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [department, setDepartment] = useState<string>('');
  const [departments, setDepartments] = React.useState<string[]>([]);
  React.useEffect(() => {
    void allDepartments().then(setDepartments);
  }, []);

  const [openSheet, setOpenSheet] = useState<'detection' | 'standard' | 'department' | null>(null);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<StandardSuggestion | null>(null);
  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);

  const canSuggest = title.trim().length > 0 && description.trim().length > 0;
  const canSave = title.trim().length > 0 && detectionPoint !== null && description.trim().length > 0;

  const onSuggestStandards = async () => {
    if (!canSuggest || suggesting) return;
    setSuggesting(true);
    try {
      const result = await suggestStandards(
        title.trim(),
        description.trim(),
        profile?.standard ?? '',
      );
      setSuggestion(result);
      if (result.standards.length > 0) {
        const mapped = mapToStandardRef(result.standards[0]);
        if (mapped) setStandardRef(mapped);
      }
    } catch (err) {
      Alert.alert(
        'Suggestion unavailable',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setSuggesting(false);
    }
  };

  const toggleClause = (clause: string) => {
    setSelectedClauses((prev) =>
      prev.includes(clause) ? prev.filter((c) => c !== clause) : [...prev, clause],
    );
  };

  const onPickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera unavailable', 'Allow camera access to attach photo evidence.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const next = result.assets.map((a) => ({ uri: a.uri, capturedAt: nowISO() }));
    setPhotos((p) => [...p, ...next]);
  };

  const onPickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Gallery unavailable', 'Allow photo access to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (result.canceled) return;
    const next = result.assets.map((a) => ({ uri: a.uri, capturedAt: nowISO() }));
    setPhotos((p) => [...p, ...next]);
  };

  const removePhoto = (uri: string) => {
    setPhotos((p) => p.filter((ph) => ph.uri !== uri));
  };

  const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (selected) setDueDate(selected);
  };

  const onSave = async () => {
    if (!canSave || submitting || !detectionPoint) return;
    setSubmitting(true);
    try {
      const ncr = await createNCR({
        title: title.trim(),
        detectionPoint,
        severity,
        standardRef: standardRef ?? 'N/A',
        standardClauses: selectedClauses,
        description: description.trim(),
        photos,
        containmentAction: containmentAction.trim(),
        assignedTo: assignedTo.trim(),
        dueDate: dueDate ? dueDate.toISOString() : '',
        department: department.trim(),
      });
      navigation.replace('NCRDetail', { ncrId: ncr.id });
    } catch (err) {
      Alert.alert('Could not save NCR', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="New Nonconformance"
        subtitle="Document what was found"
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
          <FormField label="NCR Title" required>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Brief description of the issue"
              placeholderTextColor={Colors.secondaryText}
              maxLength={120}
            />
          </FormField>

          <FormField label="Detection Point" required>
            <Pressable
              onPress={() => setOpenSheet('detection')}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !detectionPoint && { color: Colors.secondaryText },
                ]}
              >
                {detectionPoint ?? 'Select where it was found'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
            </Pressable>
          </FormField>

          <FormField label="Department" hint="Optional — powers the By Department report">
            <Pressable
              onPress={() => setOpenSheet('department')}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !department && { color: Colors.secondaryText },
                ]}
              >
                {department || 'Select department (optional)'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
            </Pressable>
          </FormField>

          <FormField label="Severity" required>
            <View style={styles.segmentRow}>
              {Severities.map((s) => {
                const active = severity === s;
                const color = severityColor(s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSeverity(s)}
                    style={({ pressed }) => [
                      styles.segment,
                      {
                        backgroundColor: active ? color : Colors.card,
                        borderColor: active ? color : Colors.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        { color: active ? Colors.card : color },
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FormField>

          <FormField label="Standard Reference">
            <Pressable
              onPress={() => setOpenSheet('standard')}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !standardRef && { color: Colors.secondaryText },
                ]}
              >
                {standardRef ?? 'Select standard reference'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.secondaryText} />
            </Pressable>
          </FormField>

          <FormField label="Description" required>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the nonconformance in detail..."
              placeholderTextColor={Colors.secondaryText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </FormField>

          <View style={styles.aiBlock}>
            <QuickActionButton
              label={suggesting ? 'Analyzing…' : 'Suggest Standard with AI'}
              variant="outline"
              icon="sparkles-outline"
              onPress={onSuggestStandards}
              disabled={!canSuggest || suggesting}
              fullWidth
            />
            {!canSuggest ? (
              <Text style={styles.aiHint}>
                Fill in Title and Description to get an AI standard recommendation.
              </Text>
            ) : null}
            {suggestion ? (
              <View style={styles.aiCard}>
                <View style={styles.aiCardHeader}>
                  <Ionicons name="sparkles" size={15} color={Colors.amber} />
                  <Text style={styles.aiCardTitle}>AI Recommendation</Text>
                </View>
                <Text style={styles.aiRecommendation}>{suggestion.recommendation}</Text>
                {suggestion.standards.length > 0 ? (
                  <>
                    <Text style={styles.aiSelectHint}>
                      Tap any that apply — they’ll be saved with this NCR.
                    </Text>
                    <View style={styles.chipWrap}>
                      {suggestion.standards.map((s) => {
                        const on = selectedClauses.includes(s);
                        return (
                          <Pressable
                            key={s}
                            onPress={() => toggleClause(s)}
                            style={({ pressed }) => [
                              styles.chip,
                              on && styles.chipOn,
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Ionicons
                              name={on ? 'checkmark-circle' : 'ellipse-outline'}
                              size={15}
                              color={on ? Colors.card : Colors.steelBlue}
                            />
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text style={styles.aiHint}>
                    No specific clause identified — select a reference manually above.
                  </Text>
                )}
              </View>
            ) : null}
          </View>

          <FormField label="Photo Evidence" hint="Attach photos to support your documentation">
            <View style={styles.photoButtonsRow}>
              <Pressable
                onPress={onPickFromCamera}
                style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="camera-outline" size={18} color={Colors.steelBlue} />
                <Text style={styles.photoBtnLabel}>Camera</Text>
              </Pressable>
              <Pressable
                onPress={onPickFromGallery}
                style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="images-outline" size={18} color={Colors.steelBlue} />
                <Text style={styles.photoBtnLabel}>Gallery</Text>
              </Pressable>
            </View>
            {photos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoStrip}
              >
                {photos.map((p) => (
                  <View key={p.uri} style={styles.thumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.thumb} />
                    <Pressable onPress={() => removePhoto(p.uri)} style={styles.thumbRemove}>
                      <Ionicons name="close" size={14} color={Colors.card} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </FormField>

          <FormField label="Containment Action">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={containmentAction}
              onChangeText={setContainmentAction}
              placeholder="Immediate action taken to contain the issue"
              placeholderTextColor={Colors.secondaryText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </FormField>

          <FormField label="Assigned To">
            <TextInput
              style={styles.input}
              value={assignedTo}
              onChangeText={setAssignedTo}
              placeholder="Owner name or team"
              placeholderTextColor={Colors.secondaryText}
            />
          </FormField>

          <FormField label="Due Date">
            <Pressable
              onPress={() => setShowDate(true)}
              style={({ pressed }) => [styles.input, styles.dropdown, pressed && { opacity: 0.85 }]}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !dueDate && { color: Colors.secondaryText },
                ]}
              >
                {dueDate ? formatDate(dueDate.toISOString()) : 'Select a due date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.secondaryText} />
            </Pressable>
            {showDate ? (
              <DateTimePicker
                mode="date"
                value={dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                onChange={onChangeDate}
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            ) : null}
            {Platform.OS === 'ios' && showDate ? (
              <Pressable onPress={() => setShowDate(false)}>
                <Text style={styles.iosDateDone}>Done</Text>
              </Pressable>
            ) : null}
          </FormField>

          <QuickActionButton
            label={submitting ? 'Saving…' : 'Save NCR'}
            variant="primary"
            onPress={onSave}
            disabled={!canSave || submitting}
            fullWidth
            icon="save-outline"
          />
          <Text style={styles.footerHint}>
            An NCR number will be assigned automatically on save.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={openSheet === 'detection'}
        title="Detection Point"
        options={DetectionPoints}
        selected={detectionPoint}
        onSelect={(v) => setDetectionPoint(v)}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'standard'}
        title="Standard Reference"
        options={StandardReferences}
        selected={standardRef}
        onSelect={(v) => setStandardRef(v)}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'department'}
        title="Department"
        options={departments}
        selected={department || null}
        onSelect={(v) => setDepartment(v)}
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
    minHeight: 96,
    paddingVertical: 10,
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
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoBtn: {
    flex: 1,
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
  photoStrip: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  thumbWrap: {
    position: 'relative',
    marginRight: 8,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radii.button,
    backgroundColor: Colors.border,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  iosDateDone: {
    color: Colors.steelBlue,
    fontWeight: '600',
    textAlign: 'right',
    paddingTop: 6,
  },
  footerHint: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  aiBlock: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  aiHint: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 17,
  },
  aiCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.amber + '50',
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.amber,
    textTransform: 'uppercase',
  },
  aiRecommendation: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 20,
  },
  aiSelectHint: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.steelBlue + '50',
    backgroundColor: Colors.steelBlue + '12',
    minHeight: 44,
  },
  chipOn: {
    backgroundColor: Colors.steelBlue,
    borderColor: Colors.steelBlue,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.steelBlue,
    flexShrink: 1,
  },
  chipTextOn: {
    color: Colors.card,
  },
});
