import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { AuditsScreen } from '../screens/AuditsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { NCRListScreen } from '../screens/NCRListScreen';
import { TrainingScreen } from '../screens/TrainingScreen';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<
  keyof TabParamList,
  [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]
> = {
  Dashboard: ['home-outline', 'home'],
  NCRs: ['clipboard-outline', 'clipboard'],
  Audits: ['checkbox-outline', 'checkbox'],
  Training: ['school-outline', 'school'],
  More: ['ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle'],
};

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.secondaryText,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const [outline, filled] = ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="NCRs" component={NCRListScreen} />
      <Tab.Screen name="Audits" component={AuditsScreen} />
      <Tab.Screen name="Training" component={TrainingScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
