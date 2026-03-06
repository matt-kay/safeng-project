import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { WebConfirmationDialog } from '@/components/WebConfirmationDialog';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function CustomSplash() {
  return (
    <View style={styles.splashContainer}>
      <StatusBar style="dark" />
      <View style={styles.splashContent}>
        <Text style={styles.splashIcon}>⚡</Text>
        <Text style={styles.splashTitle}>BriskVTU</Text>
        <Text style={styles.splashSubtitle}>Fast, Secure & Reliable Top-ups</Text>
      </View>
      <Text style={styles.versionText}>v1.0.0</Text>
    </View>
  );
}

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const { hasSeenOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { user, profile, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const segments = useSegments();
  const router = useRouter();

  const isLoading = onboardingLoading || authLoading;

  // Branding delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded && !isLoading && !showSplash) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading, showSplash]);

  useEffect(() => {
    if (isLoading || hasSeenOnboarding === null || showSplash) return;

    const inOnboardingGroup = segments[0] === 'onboarding';
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!hasSeenOnboarding) {
      if (!inOnboardingGroup) {
        router.replace('/onboarding');
      }
      return;
    }

    // Auth logic
    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // User is logged in, check profile
      if (profile && !profile.isProfileComplete) {
        if (segments[1] !== 'setup-profile') {
          router.replace('/(auth)/setup-profile');
        }
      } else if (inOnboardingGroup || inAuthGroup) {
        // Logged in and profile complete, but in onboarding or auth screens
        router.replace('/(tabs)');
      }
    }
  }, [hasSeenOnboarding, user, profile, isLoading, segments, showSplash]);

  if (!loaded || isLoading || showSplash) {
    return <CustomSplash />;
  }

  return <>{children}</>;
}

function RootLayoutContent() {
  const { resolvedTheme } = useSettings();

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <NavigationGuard>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false, title: 'Sign In' }} />
          <Stack.Screen name="(auth)/otp" options={{ headerShown: false, title: 'Verify Phone' }} />
          <Stack.Screen name="(auth)/setup-profile" options={{ headerShown: false, title: 'Setup Profile' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="update-profile" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="about" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="contact" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="beneficiaries" options={{ headerShown: false }} />
          <Stack.Screen name="transactions" options={{ headerShown: false }} />
          <Stack.Screen name="transaction-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="coupons" options={{ headerShown: false }} />
          <Stack.Screen name="coupon-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="vtu" options={{ headerShown: false }} />
          <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        </Stack>
        <WebConfirmationDialog />
      </NavigationGuard>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <OnboardingProvider>
        <AuthProvider>
          <ConfirmationProvider>
            <RootLayoutContent />
          </ConfirmationProvider>
        </AuthProvider>
      </OnboardingProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  splashIcon: {
    fontSize: 80,
    color: '#FF9500',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
  },
  splashSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 40,
  },
});
