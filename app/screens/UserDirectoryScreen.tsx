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
import { FeatureLock } from '../components/FeatureLock';
import { QuickActionButton } from '../components/QuickActionButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Radii, Shadow, Spacing } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { useTeamDirectory } from '../hooks/useTeamDirectory';
import { RootStackParamList } from '../navigation/types';
import { generateId } from '../utils/ncrHelpers';
import { isBundle } from '../utils/subscription';

type Props = NativeStackScreenProps<RootStackParamList, 'UserDirectory'>;

export function UserDirectoryScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const { members, addMember, removeMember } = useTeamDirectory();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');

  const resetForm = () => {
    setName('');
    setRole('');
    setEmail('');
  };

  const onAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the team member’s name.');
      return;
    }
    await addMember({
      id: generateId('tm'),
      name: name.trim(),
      role: role.trim(),
      email: email.trim(),
      permissionRole: 'standard',
    });
    resetForm();
    setAdding(false);
  };

  const onRemove = (id: string, memberName: string) => {
    Alert.alert('Remove member?', `${memberName} will be removed from the directory.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(id) },
    ]);
  };

  if (!isBundle(profile)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScreenHeader title="User Directory" onBack={() => navigation.goBack()} />
        <FeatureLock
          tier="bundle"
          title="Shared User Directory"
          description="Maintain a shared roster of team members and assign NCRs, actions, and audits to them across the team."
          bullets={[
            'Add team members with name, role, and email',
            'Assign work from a shared dropdown',
            'Synced with Bundle cloud workspace',
          ]}
          onUpgrade={() => navigation.navigate('Settings')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="User Directory"
        subtitle="Shared team members"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <QuickActionButton
          label="Add Team Member"
          variant="amber"
          icon="person-add-outline"
          onPress={() => setAdding(true)}
          fullWidth
        />

        {members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color={Colors.steelBlue} />
            <Text style={styles.emptyTitle}>No team members yet</Text>
            <Text style={styles.emptyBody}>
              Add team members so they can be assigned to NCRs, actions, and audits.
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {members.map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.detail}>
                    {[m.role, m.email].filter(Boolean).join(' · ') || 'No details'}
                  </Text>
                </View>
                <Pressable onPress={() => onRemove(m.id, m.name)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={Colors.secondaryText} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={adding} animationType="slide" transparent onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView
          style={styles.modalFill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <Pressable style={styles.backdrop} onPress={() => setAdding(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Add Team Member</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={Colors.secondaryText}
            />
            <TextInput
              style={styles.input}
              value={role}
              onChangeText={setRole}
              placeholder="Role (e.g. Quality Engineer)"
              placeholderTextColor={Colors.secondaryText}
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={Colors.secondaryText}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.sheetActions}>
              <QuickActionButton label="Cancel" variant="ghost" onPress={() => setAdding(false)} />
              <QuickActionButton label="Add" variant="primary" onPress={onAdd} />
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  emptyCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  row: {
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  detail: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
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
    gap: Spacing.md,
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
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
