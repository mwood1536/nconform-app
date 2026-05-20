import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';
import { useProfile } from '../hooks/useProfile';
import { ActionsScreen } from '../screens/ActionsScreen';
import { AICorrectiveActionScreen } from '../screens/AICorrectiveActionScreen';
import { AuditBuilderScreen } from '../screens/AuditBuilderScreen';
import { AuditExecutionScreen } from '../screens/AuditExecutionScreen';
import { AuditScheduleScreen } from '../screens/AuditScheduleScreen';
import { LogNCRScreen } from '../screens/LogNCRScreen';
import { NCRDetailScreen } from '../screens/NCRDetailScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { OnePagerScreen } from '../screens/OnePagerScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StandardsLibraryScreen } from '../screens/StandardsLibraryScreen';
import { TrainingFormScreen } from '../screens/TrainingFormScreen';
import { TrainingTemplatesScreen } from '../screens/TrainingTemplatesScreen';
import { SafetyObservationScreen } from '../screens/SafetyObservationScreen';
import { UserDirectoryScreen } from '../screens/UserDirectoryScreen';
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
        <Stack.Screen name="AICorrectiveAction" component={AICorrectiveActionScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Actions" component={ActionsScreen} />
        <Stack.Screen name="OnePager" component={OnePagerScreen} />
        <Stack.Screen name="UserDirectory" component={UserDirectoryScreen} />
        <Stack.Screen name="StandardsLibrary" component={StandardsLibraryScreen} />
        <Stack.Screen
          name="AuditBuilder"
          component={AuditBuilderScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="AuditExecution" component={AuditExecutionScreen} />
        <Stack.Screen name="AuditSchedule" component={AuditScheduleScreen} />
        <Stack.Screen
          name="TrainingForm"
          component={TrainingFormScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="TrainingTemplates" component={TrainingTemplatesScreen} />
        <Stack.Screen
          name="SafetyObservation"
          component={SafetyObservationScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
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
