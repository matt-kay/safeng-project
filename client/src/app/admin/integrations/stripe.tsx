import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminIntegrationService, StripeStatusResponse } from '@/services/sdk/admin-integration-service';

export default function StripeIntegrationScreen() {
    const { colors } = useSettings();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<StripeStatusResponse | null>(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const data = await AdminIntegrationService.getStripeStatus();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch Stripe status:', error);
        } finally {
            setLoading(false);
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
                title: 'Stripe Integration',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status Details</Text>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={styles.row}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Environment</Text>
                            <View style={[
                                styles.badge,
                                { backgroundColor: status?.environment === 'Live' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 149, 0, 0.2)' }
                            ]}>
                                <Text style={[
                                    styles.badgeText,
                                    { color: status?.environment === 'Live' ? '#34C759' : '#FF9500' }
                                ]}>{status?.environment || 'Unknown'}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
