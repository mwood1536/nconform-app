import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './app/navigation/AppNavigator';
import { Colors } from './app/constants/colors';
import { configureNotificationHandler } from './app/utils/notifications';

export default function App() {
  useEffect(() => {
    configureNotificationHandler();
    if (Platform.OS === 'android') {
      // Match the system nav bar to the app surface so SafeAreaView's bottom
      // inset reads correctly and tab labels are never clipped.
      NavigationBar.setBackgroundColorAsync(Colors.background).catch(() => undefined);
      NavigationBar.setButtonStyleAsync('dark').catch(() => undefined);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
