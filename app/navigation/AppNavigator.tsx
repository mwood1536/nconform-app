import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { AICorrectiveActionScreen } from '../screens/AICorrectiveActionScreen';
import { LogNCRScreen } from '../screens/LogNCRScreen';
import { NCRDetailScreen } from '../screens/NCRDetailScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
        initialRouteName={profile ? 'Main' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={BottomTabNavigator} />
        <Stack.Screen
          name="LogNCR"
          component={LogNCRScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="NCRDetail" component={NCRDetailScreen} />
        <Stack.Screen
          name="AICorrectiveAction"
          component={AICorrectiveActionScreen}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
