import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../constants/colors';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Shows an amber offline strip; when connectivity returns it briefly shows a
// green "synced" confirmation, then disappears.
export function OfflineBanner() {
  const { ready, isOnline, justReconnected } = useNetworkStatus();

  if (!ready || (isOnline && !justReconnected)) return null;

  if (isOnline && justReconnected) {
    return (
      <View style={[styles.bar, styles.online]}>
        <Ionicons name="cloud-done-outline" size={14} color={Colors.successGreen} />
        <Text style={[styles.text, { color: Colors.successGreen }]}>
          Back online — synced.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.offline]}>
      <Ionicons name="cloud-offline-outline" size={14} color={Colors.amber} />
      <Text style={[styles.text, { color: Colors.amber }]}>
        Offline — will sync when connected.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  offline: {
    backgroundColor: Colors.amber + '14',
    borderColor: Colors.amber + '40',
  },
  online: {
    backgroundColor: Colors.successGreen + '14',
    borderColor: Colors.successGreen + '40',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
