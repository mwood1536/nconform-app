import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { SafetyObservation } from '../types';
import { formatDate, generateId, nowISO } from '../utils/ncrHelpers';
import { entitlements } from '../core/EntitlementService';
import { Storage } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyObservation'>;

export function SafetyObservationScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<SafetyObservation[]>([]);

  const teamLinked = entitlements.isBundleSync();

  useEffect(() => {
    void Storage.getSafetyObservations().then((list) => {
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setHistory(list);
    });
  }, []);

  const addPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera unavailable',
        'Allow camera access to attach a photo to your observation.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (result.canceled) return;
    setPhoto(result.assets[0]?.uri ?? null);
  };

  const onSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      Alert.alert('Describe what you saw', 'Add a short note before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const observation: SafetyObservation = {
        id: generateId('obs'),
        description: trimmed,
        photo,
        location: location.trim(),
        createdAt: nowISO(),
        // On Bundle, observations queue up locally and sync when account-link
        // wires to a Pro Web workspace. Until then they remain local-only.
        syncedToTeam: teamLinked,
        destinationTeamId: null,
        isSampleData: false,
      };
      const all = await Storage.getSafetyObservations();
      await Storage.setSafetyObservations([observation, ...all]);
      setHistory([observation, ...history]);
      setDescription('');
      setLocation('');
      setPhoto(null);
      Alert.alert(
        'Observation logged',
        teamLinked
          ? 'Queued for your linked team workspace.'
          : 'Saved locally. Pair with a Pro Web team to route observations automatically.',
      );
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Safety Observation"
        subtitle="Free for everyone on the shop floor"
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
          <View style={styles.banner}>
            <Ionicons name="shield-outline" size={18} color={Colors.amber} />
            <Text style={styles.bannerText}>
              {teamLinked
                ? 'Your observations route to the linked Pro Web team queue.'
                : 'Anyone can flag safety issues. Link a Pro Web team in Settings to route observations there.'}
            </Text>
          </View>

          <FormField label="What did you see?" required>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the hazard, near miss, or concern"
              placeholderTextColor={Colors.secondaryText}
              multiline
              textAlignVertical="top"
            />
          </FormField>

          <FormField label="Location (optional)">
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Line 3, north aisle"
              placeholderTextColor={Colors.secondaryText}
            />
          </FormField>

          <FormField label="Photo (optional)">
            <Pressable
              onPress={addPhoto}
              style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="camera-outline" size={18} color={Colors.steelBlue} />
              <Text style={styles.photoBtnLabel}>{photo ? 'Replace photo' : 'Capture photo'}</Text>
            </Pressable>
            {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}
          </FormField>

          <QuickActionButton
            label={submitting ? 'Submitting…' : 'Submit Observation'}
            variant="amber"
            icon="paper-plane-outline"
            onPress={onSubmit}
            disabled={submitting}
            fullWidth
          />

          {history.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Recent Observations</Text>
              <View style={{ gap: Spacing.sm }}>
                {history.slice(0, 10).map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="alert-outline" size={16} color={Colors.amber} />
                      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                      {item.syncedToTeam ? (
                        <View style={styles.syncTag}>
                          <Ionicons name="cloud-done-outline" size={11} color={Colors.steelBlue} />
                          <Text style={styles.syncTagText}>Routed</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardBody}>{item.description}</Text>
                    {item.location ? (
                      <Text style={styles.cardMeta}>Location: {item.location}</Text>
                    ) : null}
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.thumb} />
                    ) : null}
                  </View>
                ))}
              </View>
            </>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.amber + '12',
    borderRadius: Radii.button,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.bodyText,
    lineHeight: 17,
    fontWeight: '600',
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
    minHeight: 110,
    paddingTop: 10,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
    flex: 1,
  },
  syncTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.steelBlue + '14',
  },
  syncTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.steelBlue,
  },
  cardBody: {
    fontSize: 14,
    color: Colors.bodyText,
    lineHeight: 19,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  thumb: {
    width: '100%',
    height: 140,
    borderRadius: Radii.button,
    backgroundColor: Colors.border,
    marginTop: Spacing.xs,
  },
});
