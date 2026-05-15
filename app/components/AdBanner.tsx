import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Spacing } from '../constants/colors';

interface Props {
  visible: boolean;
  onUpgrade?: () => void;
}

export function AdBanner({ visible, onUpgrade }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.amber} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Upgrade to NConform Pro</Text>
          <Text style={styles.subtitle}>Remove ads, export PDFs, generate one-pagers.</Text>
        </View>
        <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaLabel}>Upgrade</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  inner: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.amber + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.navy,
    borderRadius: Radii.button,
  },
  ctaLabel: {
    color: Colors.card,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
