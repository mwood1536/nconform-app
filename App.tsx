import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './app/navigation/AppNavigator';
import { Colors } from './app/constants/colors';
import { configureNotificationHandler } from './app/utils/notifications';
import { installSyncTriggers } from './app/core/sync/triggers';

// Boot AdMob outside Expo Go (where the native module is absent). Wrapped in
// require so dev clients without the package still launch.
function initAdMob(): void {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mobileAds = require('react-native-google-mobile-ads').default as
      | (() => { initialize: () => Promise<unknown> })
      | undefined;
    mobileAds?.()
      .initialize()
      .catch(() => undefined);
  } catch {
    // AdMob unavailable in this environment — no-op.
  }
}

export default function App() {
  useEffect(() => {
    configureNotificationHandler();
    initAdMob();
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(Colors.background).catch(() => undefined);
      NavigationBar.setButtonStyleAsync('dark').catch(() => undefined);
    }
    // Install cloud-sync flush triggers (foreground / sign-in / post-write).
    // No-op for free/anonymous users — runFlush gates on identity + key.
    const removeSyncTriggers = installSyncTriggers();
    return removeSyncTriggers;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
