import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

export function IronStratosWordmark({ size = 'sm', light = false }: Props) {
  const fontSize = size === 'lg' ? 14 : size === 'md' ? 12 : 11;
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.text,
          { fontSize, color: light ? Colors.card : Colors.secondaryText },
        ]}
      >
        IRONSTRATOS
      </Text>
      <Text
        style={[
          styles.dot,
          { fontSize, color: Colors.amber },
        ]}
      >
        {' • '}
      </Text>
      <Text
        style={[
          styles.text,
          { fontSize, color: light ? Colors.card : Colors.secondaryText, fontWeight: '500' },
        ]}
      >
        LLC
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  dot: {
    fontWeight: '700',
  },
});
