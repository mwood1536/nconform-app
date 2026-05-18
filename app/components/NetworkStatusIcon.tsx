import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Small always-present connectivity glyph for screen headers.
export function NetworkStatusIcon() {
  const { ready, isOnline } = useNetworkStatus();
  if (!ready) return null;
  return (
    <View style={styles.wrap} accessibilityLabel={isOnline ? 'Online' : 'Offline'}>
      <Ionicons
        name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
        size={18}
        color={isOnline ? Colors.secondaryText : Colors.amber}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
