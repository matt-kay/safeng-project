import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { colors, resolvedTheme } = useSettings();

  const isDark = resolvedTheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.subtext }]}>Hello,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{profile?.firstName || 'User'} 👋</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
  },
});
