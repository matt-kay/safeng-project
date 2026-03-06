import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { PhoneInput, COUNTRIES } from '@/components/PhoneInput';
import { PortalSettingsService } from '@/services/sdk/portal-settings-service';
import apiClient from '@/services/sdk/api-client';

const portalSettingsService = new PortalSettingsService(apiClient);

export default function LoginScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [loading, setLoading] = useState(false);

    const { signIn } = useAuth();
    const router = useRouter();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();

    const isDark = resolvedTheme === 'dark';



    const handleSignIn = async () => {
        triggerHaptic();
        if (!phoneNumber || phoneNumber.length < 8) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number.');
            return;
        }

        setLoading(true);
        try {
            const formattedNumber = `${selectedCountry.code}${phoneNumber}`;
            const confirmation = await signIn(formattedNumber);
            router.push({
                pathname: '/(auth)/otp',
                params: { phoneNumber: formattedNumber, verificationId: confirmation?.verificationId || 'mock_id' }
            });
        } catch (error: any) {
            console.error('Sign in error:', error);
            Alert.alert('Error', error.message || 'Failed to send verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={[styles.content]}>
                        <View style={styles.header}>
                            <Text style={[styles.icon, { color: colors.primary }]}>⚡</Text>
                            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>Sign in with your phone number to continue</Text>
                        </View>

                        <View style={styles.form}>
                            <PhoneInput
                                phoneNumber={phoneNumber}
                                setPhoneNumber={setPhoneNumber}
                                selectedCountry={selectedCountry}
                                setSelectedCountry={setSelectedCountry}
                                autoFocus
                            />

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: colors.primary },
                                    (!phoneNumber || loading) && { backgroundColor: isDark ? colors.primary + '40' : colors.primary + '80' }
                                ]}
                                onPress={handleSignIn}
                                disabled={!phoneNumber || loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Sending Code...' : 'Continue'}
                                </Text>
                            </TouchableOpacity>

                            <View
                                id="recaptcha-container"
                                nativeID="recaptcha-container"
                            />
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: colors.subtext }]}>By continuing, you agree to our </Text>
                            <TouchableOpacity onPress={() => triggerHaptic()}>
                                <Text style={[styles.linkText, { color: colors.primary }]}>Terms of Service</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: Platform.OS === 'web' ? 20 : 40,
    },
    icon: {
        fontSize: 60,
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },

    form: {
        width: '100%',
        marginBottom: 40,
    },
    button: {
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
    },
    footerText: {
        fontSize: 14,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

