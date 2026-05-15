import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../constants/colors';

interface Props {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, required = false, hint, children }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.bodyText,
    letterSpacing: 0.2,
  },
  required: {
    color: Colors.errorRed,
  },
  hint: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});
