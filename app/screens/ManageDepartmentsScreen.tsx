import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
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
import { RootStackParamList } from '../navigation/types';
import { DefaultDepartments } from '../utils/departments';
import { Storage } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageDepartments'>;

export function ManageDepartmentsScreen({ navigation }: Props) {
  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void Storage.getCustomDepartments().then(setCustom);
  }, []);

  const persist = async (next: string[]) => {
    setCustom(next);
    await Storage.setCustomDepartments(next);
  };

  const onAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (
      DefaultDepartments.some((d) => d.toLowerCase() === trimmed.toLowerCase()) ||
      custom.some((d) => d.toLowerCase() === trimmed.toLowerCase())
    ) {
      Alert.alert('Already exists', 'That department is already in the list.');
      return;
    }
    void persist([...custom, trimmed]);
    setDraft('');
  };

  const onRemove = (name: string) => {
    Alert.alert('Remove department?', `Remove "${name}" from the dropdown?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => persist(custom.filter((d) => d !== name)),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Manage Departments"
        subtitle="Custom labels for NCRs and audits"
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Prebuilt</Text>
          <View style={{ gap: 6 }}>
            {DefaultDepartments.map((d) => (
              <View key={d} style={styles.row}>
                <Ionicons name="bookmark-outline" size={14} color={Colors.steelBlue} />
                <Text style={styles.rowText}>{d}</Text>
                <Text style={styles.lockedTag}>Built-in</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Custom</Text>
          {custom.length === 0 ? (
            <Text style={styles.empty}>No custom departments yet.</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {custom.map((d) => (
                <View key={d} style={styles.row}>
                  <Ionicons name="business-outline" size={14} color={Colors.navy} />
                  <Text style={styles.rowText}>{d}</Text>
                  <Pressable onPress={() => onRemove(d)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.addCard}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="New department name"
              placeholderTextColor={Colors.secondaryText}
            />
            <QuickActionButton
              label="Add Department"
              variant="primary"
              icon="add-circle-outline"
              onPress={onAdd}
              fullWidth
            />
          </View>
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
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    padding: Spacing.md,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: Colors.bodyText,
    fontWeight: '600',
  },
  lockedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryText,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.border,
    borderRadius: Radii.pill,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  empty: {
    fontSize: 13,
    color: Colors.secondaryText,
    fontStyle: 'italic',
  },
  addCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.button,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    color: Colors.bodyText,
    fontSize: 14,
    minHeight: 44,
  },
});
