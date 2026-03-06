import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

export default function SOSCallbackScreen() {
    const { reference } = useLocalSearchParams();
    const router = useRouter();
    const { refreshProfile } = useAuth();
    const { colors } = useSettings();
    const [status, setStatus] = useState('Verifying payment...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                if (!reference) {
                    setStatus('Invalid callback: missing reference.');
                    setTimeout(() => {
                        router.replace('/');
                    }, 3000);
                    return;
                }

                // Wait a brief moment to allow webhook processing, then refresh profile
                setStatus('Processing your subscription...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                if (refreshProfile) {
                    await refreshProfile();
                }

                setStatus('Success! Redirecting...');
                setTimeout(() => {
                    // If the profile refreshed successfully, they should either set up contacts or go to management
                    router.replace({
                        pathname: '/sos-setup',
                        params: { isFirstTime: 'true' }
                    });
                }, 1500);

            } catch (error) {
                console.error('Error handling SOS callback:', error);
                setStatus('Something went wrong. Redirecting...');
                setTimeout(() => {
                    router.replace('/');
                }, 3000);
            }
        };

        handleCallback();
    }, [reference, refreshProfile, router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
});
