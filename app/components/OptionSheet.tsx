import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radii, Spacing } from '../constants/colors';

interface Props<T extends string> {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: Props<T>) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handleBar} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={Colors.navy} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {options.map((opt) => {
              const active = opt === selected;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{opt}</Text>
                  {active ? (
                    <Ionicons name="checkmark" size={18} color={Colors.navy} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0A1628B3',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
  },
  row: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  rowActive: {
    backgroundColor: Colors.card,
  },
  rowText: {
    fontSize: 15,
    color: Colors.bodyText,
    fontWeight: '500',
  },
  rowTextActive: {
    color: Colors.navy,
    fontWeight: '700',
  },
});

export default OptionSheet;
