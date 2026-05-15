import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Spacing } from '../constants/colors';

type Variant = 'primary' | 'outline' | 'ghost' | 'amber';

interface Props {
  label: string;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function QuickActionButton({
  label,
  variant = 'primary',
  icon,
  onPress,
  disabled = false,
  fullWidth = false,
}: Props) {
  const styleSet = stylesFor(variant, disabled);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styleSet.button,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <View style={styles.content}>
        {icon ? <Ionicons name={icon} size={16} color={styleSet.icon} /> : null}
        <Text style={[styles.label, { color: styleSet.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function stylesFor(variant: Variant, disabled: boolean) {
  if (disabled) {
    return {
      button: { backgroundColor: Colors.border, borderColor: Colors.border },
      text: Colors.secondaryText,
      icon: Colors.secondaryText,
    };
  }
  switch (variant) {
    case 'primary':
      return {
        button: { backgroundColor: Colors.navy, borderColor: Colors.navy },
        text: Colors.card,
        icon: Colors.card,
      };
    case 'amber':
      return {
        button: { backgroundColor: Colors.amber, borderColor: Colors.amber },
        text: Colors.card,
        icon: Colors.card,
      };
    case 'outline':
      return {
        button: { backgroundColor: Colors.card, borderColor: Colors.steelBlue },
        text: Colors.steelBlue,
        icon: Colors.steelBlue,
      };
    case 'ghost':
    default:
      return {
        button: { backgroundColor: 'transparent', borderColor: 'transparent' },
        text: Colors.steelBlue,
        icon: Colors.steelBlue,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
