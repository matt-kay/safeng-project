import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';

function TabBarIcon({ icon, color, label, focused }: { icon: keyof typeof Ionicons.glyphMap, color: string, label: string, focused: boolean }) {
  const { triggerHaptic } = useSettings();

  useEffect(() => {
    if (focused && Platform.OS !== 'web') {
      triggerHaptic();
    }
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={24} color={color} style={styles.tabIcon} />
      <Text style={[styles.iconLabel, { color, fontWeight: focused ? '600' : '400' }]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useSettings();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.subtext,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={focused ? "home" : "home-outline"} color={color} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={focused ? "wallet" : "wallet-outline"} color={color} label="Wallet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vtu"
        options={{
          title: 'VTU',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={focused ? "apps" : "apps-outline"} color={color} label="VTU" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => <TabBarIcon icon={focused ? "menu" : "menu-outline"} color={color} label="Menu" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  tabIcon: {
    marginBottom: 2,
  },
  iconLabel: {
    fontSize: 10,
  },
});
