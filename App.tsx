import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './app/navigation/AppNavigator';
import { Colors } from './app/constants/colors';
import { configureNotificationHandler } from './app/utils/notifications';

export default function App() {
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
