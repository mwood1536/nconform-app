import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { ActionsScreen } from '../screens/ActionsScreen';
import { AuditsScreen } from '../screens/AuditsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { NCRListScreen } from '../screens/NCRListScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

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
          const iconMap: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Dashboard: ['home-outline', 'home'],
            NCRs: ['clipboard-outline', 'clipboard'],
            Audits: ['shield-checkmark-outline', 'shield-checkmark'],
            Actions: ['flash-outline', 'flash'],
            Reports: ['document-text-outline', 'document-text'],
          };
          const [outline, filled] = iconMap[route.name as keyof TabParamList];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="NCRs" component={NCRListScreen} />
      <Tab.Screen name="Audits" component={AuditsScreen} />
      <Tab.Screen name="Actions" component={ActionsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
}
