import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { UserService, EmergencyContact } from '@/services/sdk/user-service';

export default function SOSManagementScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const router = useRouter();
    const isDark = resolvedTheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await UserService.getSOSStatus();
            setContacts(data.contacts || []);
            setIsSubscribed(data.subscribed || false);
        } catch (error) {
            console.error('Error fetching SOS status:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>SOS Emergency</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.statusCard, { backgroundColor: isSubscribed ? colors.primary : colors.error }]}>
                    <View style={styles.statusHeader}>
                        <Ionicons
                            name={isSubscribed ? "shield" : "alert-circle"}
                            size={48}
                            color="#FFF"
                        />
                        <View style={styles.statusTextContainer}>
                            <Text style={styles.statusTitle}>
                                {isSubscribed ? "You are Protected" : "Protection Inactive"}
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                {isSubscribed
                                    ? "Emergency alerts are active and ready."
                                    : "Subscribe to activate emergency alerts."}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Contacts</Text>
                        <View style={styles.sectionHeaderActions}>
                            <TouchableOpacity onPress={fetchStatus} style={styles.refreshButton}>
                                <Ionicons name="refresh" size={20} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/sos-setup')}>
                                <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {contacts.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                            <Ionicons name="people-outline" size={40} color={colors.subtext} />
                            <Text style={[styles.emptyStateText, { color: colors.subtext }]}>No contacts added yet.</Text>
                            <TouchableOpacity
                                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/sos-setup')}
                            >
                                <Text style={styles.emptyStateButtonText}>Add Contacts</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        contacts.map((contact, index) => (
                            <View key={index} style={[styles.contactItem, { backgroundColor: colors.card }]}>
                                <View style={[styles.avatarText, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                                        {contact.firstName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactName, { color: colors.text }]}>{contact.firstName} {contact.lastName}</Text>
                                    <Text style={[styles.contactPhone, { color: colors.subtext }]}>{contact.phoneNumber}</Text>
                                    {contact.relationship ? (
                                        <Text style={[styles.contactRelationship, { color: colors.subtext, fontSize: 12, marginTop: 2 }]}>
                                            {contact.relationship}
                                        </Text>
                                    ) : null}
                                </View>

                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription</Text>
                    <View style={[styles.subscriptionCard, { backgroundColor: colors.card }]}>
                        <View style={styles.subInfo}>
                            <Text style={[styles.subLabel, { color: colors.subtext }]}>Current Plan</Text>
                            <Text style={[styles.subValue, { color: colors.text }]}>SOS Emergency Alert</Text>
                        </View>
                        <View style={styles.subInfo}>
                            <Text style={[styles.subLabel, { color: colors.subtext }]}>Status</Text>
                            <Text style={[styles.subValue, { color: isSubscribed ? colors.success : colors.error }]}>
                                {isSubscribed ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.manageButton, { borderColor: colors.primary }]}
                            onPress={() => {/* Open Paystack Portal? */ }}
                        >
                            <Text style={[styles.manageButtonText, { color: colors.primary }]}>Manage Subscription</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    statusCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusTextContainer: {
        marginLeft: 20,
        flex: 1,
    },
    statusTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statusSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    editLink: {
        fontSize: 16,
        fontWeight: '600',
    },
    sectionHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    refreshButton: {
        marginRight: 16,
        padding: 4,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    avatarText: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 14,
    },
    contactRelationship: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyState: {
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
    },
    emptyStateText: {
        marginTop: 12,
        marginBottom: 20,
        fontSize: 16,
    },
    emptyStateButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyStateButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    subscriptionCard: {
        padding: 20,
        borderRadius: 20,
    },
    subInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    subLabel: {
        fontSize: 14,
    },
    subValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    manageButton: {
        marginTop: 12,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    manageButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
