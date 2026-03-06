import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput } from '@/components/OTPInput';

export default function VerifyChangePhoneScreen() {
    const { verificationId, phoneNumber } = useLocalSearchParams<{ verificationId: string, phoneNumber: string }>();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const router = useRouter();
    const { confirmNewPhoneNumber, verifyNewPhoneNumber } = useAuth();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();

    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleVerifyCode = async () => {
        triggerHaptic();
        const otpCode = code.join('');
        if (otpCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
            return;
        }

        setLoading(true);
        try {
            await confirmNewPhoneNumber(verificationId, otpCode);

            Alert.alert(
                'Success',
                'Your phone number has been updated successfully.',
                [{ text: 'Great!', onPress: () => router.dismissAll() }]
            );
        } catch (error: any) {
            console.error('Error verifying code:', error);
            Alert.alert('Error', error.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!phoneNumber || timer > 0) return;

        triggerHaptic();
        setLoading(true);
        try {
            await verifyNewPhoneNumber(phoneNumber);
            setTimer(60);
            Alert.alert('Success', 'Verification code resent!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to resend code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.card }]}
                    onPress={() => { triggerHaptic(); router.back(); }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Verify Number</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Verification</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                Enter the 6-digit code sent to {'\n'}
                                <Text style={[styles.phoneNumber, { color: colors.text }]}>{phoneNumber}</Text>
                            </Text>
                        </View>

                        <OTPInput
                            code={code}
                            setCode={setCode}
                            autoFocus
                        />

                        <View style={styles.actionSection}>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: colors.primary },
                                    (code.join('').length < 6 || loading) && { backgroundColor: isDark ? colors.primary + '40' : colors.primary + '80' }
                                ]}
                                onPress={handleVerifyCode}
                                disabled={code.join('').length < 6 || loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Verifying...' : 'Verify & Update'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleResendCode}
                                disabled={timer > 0}
                                style={styles.resendButton}
                            >
                                <Text style={[styles.resendText, { color: colors.primary }, timer > 0 && styles.resendDisabled]}>
                                    {timer > 0 ? `Resend code in ${timer}s` : 'Resend Code'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {Platform.OS === 'web' && <div id="recaptcha-container"></div>}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
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
    },
    header: {
        marginTop: 20,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    phoneNumber: {
        fontWeight: 'bold',
    },
    actionSection: {
        width: '100%',
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
        marginBottom: 24,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    resendButton: {
        alignItems: 'center',
    },
    resendText: {
        fontSize: 16,
        fontWeight: '600',
    },
    resendDisabled: {
        color: '#999',
    },
});
