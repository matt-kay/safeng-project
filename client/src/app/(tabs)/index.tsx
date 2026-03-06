import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import SOSBenefitsModal from '@/components/SOSBenefitsModal';
import AlertModal from '@/components/AlertModal';
import { useRouter } from 'expo-router';
import { UserService } from '@/services/sdk/user-service';

export default function HomeScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, resolvedTheme } = useSettings();

  const isDark = resolvedTheme === 'dark';

  const [modalVisible, setModalVisible] = React.useState(false);
  const [alertVisible, setAlertVisible] = React.useState(false);
  const [alertConfig, setAlertConfig] = React.useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
    primaryButtonText: 'OK',
    onPrimaryPress: () => { },
    secondaryButtonText: undefined as string | undefined,
    onSecondaryPress: undefined as (() => void) | undefined,
  });
  const router = useRouter();

  const [sosStatus, setSosStatus] = React.useState<{ subscribed: boolean; contacts: any[] }>({ subscribed: false, contacts: [] });

  React.useEffect(() => {
    fetchSOSStatus();
  }, [profile?.sos_subscription_active]);

  const fetchSOSStatus = async () => {
    try {
      const status = await UserService.getSOSStatus();
      setSosStatus(status);
    } catch (error) {
      console.error('Failed to fetch SOS status:', error);
    }
  };

  const handleProceed = async () => {
    setModalVisible(false);
    try {
      const { authorization_url } = await UserService.initializeSOSSubscription(Platform.OS);

      if (Platform.OS === 'web') {
        window.location.href = authorization_url;
      } else {
        const WebBrowser = require('expo-web-browser');
        const result = await WebBrowser.openAuthSessionAsync(
          authorization_url,
          'safeme://sos-callback'
        );

        if (result.type === 'success' && result.url) {
          // Handle successful return from Paystack
          const url = new URL(result.url);
          const reference = url.searchParams.get('reference');
          if (reference) {
            // Refresh profile and SOS status
            await refreshProfile?.();
            await fetchSOSStatus();

            setAlertConfig({
              title: 'Success',
              message: 'Payment initialized successfully! Let\'s set up your emergency contacts to activate your protection.',
              type: 'success',
              primaryButtonText: 'Add Contacts',
              onPrimaryPress: () => {
                setAlertVisible(false);
                router.push('/sos-setup');
              },
              secondaryButtonText: 'Later',
              onSecondaryPress: () => setAlertVisible(false),
            });
            setAlertVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to initialize subscription payment. Please try again.',
        type: 'error',
        primaryButtonText: 'OK',
        onPrimaryPress: () => setAlertVisible(false),
        secondaryButtonText: undefined,
        onSecondaryPress: undefined,
      });
      setAlertVisible(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.subtext }]}>Hello,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{profile?.firstName || 'User'} 👋</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.sosCard,
            {
              backgroundColor: sosStatus.subscribed
                ? (sosStatus.contacts.length > 0
                  ? (colors.success || '#4CAF50')
                  : (colors.warning || '#FF9800'))
                : colors.primary
            }
          ]}
          onPress={() => sosStatus.subscribed
            ? (sosStatus.contacts.length > 0
              ? router.push('/sos-management')
              : router.push('/sos-setup'))
            : setModalVisible(true)}
        >
          <View style={styles.sosCardContent}>
            <View style={styles.sosIconContainer}>
              <Ionicons
                name={sosStatus.subscribed
                  ? (sosStatus.contacts.length > 0 ? "shield-checkmark" : "warning-outline")
                  : "shield-outline"}
                size={32}
                color="#FFF"
              />
            </View>
            <View style={styles.sosTextContainer}>
              <Text style={styles.sosTitle}>
                {sosStatus.subscribed
                  ? (sosStatus.contacts.length > 0 ? "SOS Protection Active" : "Action Required")
                  : "Setup SOS Emergency Alert"}
              </Text>
              <Text style={styles.sosSubtitle}>
                {sosStatus.subscribed
                  ? (sosStatus.contacts.length > 0
                    ? "Your emergency alerts are active and ready."
                    : "Add at least one emergency contact to activate protection.")
                  : "Stay protected and alert your loved ones instantly."}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <SOSBenefitsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onProceed={handleProceed}
      />

      <AlertModal
        isVisible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        primaryButtonText={alertConfig.primaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onSecondaryPress={alertConfig.onSecondaryPress}
        onDismiss={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  sosCard: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  sosCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sosIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sosSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
});
