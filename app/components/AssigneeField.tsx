import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radii, Spacing } from '../constants/colors';
import { useTeamDirectory } from '../hooks/useTeamDirectory';
import { OptionSheet } from './OptionSheet';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Free text by default; when the shared directory has members, a chip
// opens a picker that fills the field from the team directory.
export function AssigneeField({ value, onChange, placeholder = 'Owner name or team' }: Props) {
  const { members } = useTeamDirectory();
  const [sheetOpen, setSheetOpen] = useState(false);
  const options = members.map((m) => `${m.name}${m.role ? ` · ${m.role}` : ''}`);

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondaryText}
        />
        {members.length > 0 ? (
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
            hitSlop={8}
          >
            <Ionicons name="people-outline" size={15} color={Colors.steelBlue} />
            <Text style={styles.chipLabel}>Directory</Text>
          </Pressable>
        ) : null}
      </View>
      <OptionSheet
        visible={sheetOpen}
        title="Assign from Directory"
        options={options}
        selected={null}
        onSelect={(label) => onChange(label.split(' · ')[0])}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
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
  },
  chipLabel: {
    color: Colors.steelBlue,
    fontSize: 13,
    fontWeight: '700',
  },
});
