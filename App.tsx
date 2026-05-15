import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './app/navigation/AppNavigator';
import { Colors } from './app/constants/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
