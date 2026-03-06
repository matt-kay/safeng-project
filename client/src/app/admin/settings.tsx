import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Switch,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import apiClient from '@/services/sdk/api-client';
import { PortalSettingsService, PortalSettings } from '@/services/sdk/portal-settings-service';
import AlertModal from '@/components/AlertModal';

const settingsService = new PortalSettingsService(apiClient);

export default function AdminSettingsScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal state
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Form state
    const [exchangeRate, setExchangeRate] = useState('1500');
    const [topUpFee, setTopUpFee] = useState('1.5');
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    const [initialSettings, setInitialSettings] = useState<{
        exchangeRate: string;
        topUpFee: string;
        maintenanceMode: boolean;
    } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await settingsService.getSettings();
            const exRateStr = data.exchangeRate.toString();
            const topUpFeeStr = data.topUpFeePercentage.toString();

            setExchangeRate(exRateStr);
            setTopUpFee(topUpFeeStr);
            setMaintenanceMode(data.maintenanceMode);

            setInitialSettings({
                exchangeRate: exRateStr,
                topUpFee: topUpFeeStr,
                maintenanceMode: data.maintenanceMode
            });
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to load system settings',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        triggerHaptic();

        const updates: string[] = [];
        if (initialSettings) {
            if (exchangeRate !== initialSettings.exchangeRate) {
                updates.push(`Exchange Rate: ₦${exchangeRate}`);
            }
            if (topUpFee !== initialSettings.topUpFee) {
                updates.push(`Top-up Fee: ${topUpFee}%`);
            }
            if (maintenanceMode !== initialSettings.maintenanceMode) {
                updates.push(`Maintenance Mode: ${maintenanceMode ? 'Enabled' : 'Disabled'}`);
            }
        }

        if (updates.length === 0) {
            setAlertConfig({
                visible: true,
                title: 'No Changes',
                message: 'No settings were modified.',
                type: 'info'
            });
            return;
        }

        setSaving(true);
        try {
            await settingsService.updateSettings({
                exchangeRate: parseFloat(exchangeRate) || 0,
                topUpFeePercentage: parseFloat(topUpFee) || 0,
                maintenanceMode
            });

            setInitialSettings({
                exchangeRate,
                topUpFee,
                maintenanceMode
            });

            setAlertConfig({
                visible: true,
                title: 'Settings Updated',
                message: updates.join('\n'),
                type: 'success'
            });
        } catch (error) {
            console.error('Failed to update settings:', error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to update system settings',
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'System Settings',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Financial Config</Text>
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Exchange Rate (1 USD = X NGN)</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    value={exchangeRate}
                                    onChangeText={setExchangeRate}
                                    keyboardType="numeric"
                                    placeholder="1500"
                                    placeholderTextColor={colors.subtext}
                                />
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Top-up Fee (%)</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    value={topUpFee}
                                    onChangeText={setTopUpFee}
                                    keyboardType="numeric"
                                    placeholder="1.5"
                                    placeholderTextColor={colors.subtext}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>System Status</Text>
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuLabel, { color: colors.text }]}>Maintenance Mode</Text>
                                    <Text style={[styles.menuSublabel, { color: colors.subtext }]}>
                                        Disable all client features for maintenance
                                    </Text>
                                </View>
                                <Switch
                                    value={maintenanceMode}
                                    onValueChange={setMaintenanceMode}
                                    trackColor={{ false: '#767577', true: colors.primary }}
                                    thumbColor={Platform.OS === 'ios' ? '#fff' : maintenanceMode ? '#fff' : '#f4f3f4'}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Settings</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <AlertModal
                isVisible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onDismiss={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    inputGroup: {
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        fontSize: 17,
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 17,
        fontWeight: '500',
    },
    menuSublabel: {
        fontSize: 13,
        marginTop: 2,
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});
