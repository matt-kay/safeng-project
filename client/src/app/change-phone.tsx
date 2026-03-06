import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { PhoneInput, COUNTRIES } from '@/components/PhoneInput';

export default function ChangePhoneScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { verifyNewPhoneNumber } = useAuth();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();

    const isDark = resolvedTheme === 'dark';

    const handleVerify = async () => {
        triggerHaptic();
        if (!phoneNumber || phoneNumber.length < 8) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number.');
            return;
        }

        setLoading(true);
        try {
            const formattedNumber = `${selectedCountry.code}${phoneNumber}`;
            const confirmation = await verifyNewPhoneNumber(formattedNumber);
            const verificationId = typeof confirmation === 'string' ? confirmation : confirmation.verificationId;

            router.push({
                pathname: '/verify-change-phone',
                params: {
                    verificationId: verificationId,
                    phoneNumber: formattedNumber
                }
            });
        } catch (error: any) {
            console.error('Error sending OTP:', error);
            Alert.alert('Error', error.message || 'Failed to send verification code.');
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Change Phone</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={[styles.icon, { color: colors.primary }]}>📱</Text>
                            <Text style={[styles.title, { color: colors.text }]}>New Number</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                We'll send a verification code to your new number.
                            </Text>
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
                                onPress={handleVerify}
                                disabled={!phoneNumber || loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Sending Code...' : 'Update Phone Number'}
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
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
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
});
