import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { UserService, EmergencyContact } from '@/services/sdk/user-service';
import { useAuth } from '@/context/AuthContext';
import AlertModal from '@/components/AlertModal';

export default function SOSSetupScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const router = useRouter();
    const { refreshProfile } = useAuth();
    const isDark = resolvedTheme === 'dark';

    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { isFirstTime } = useLocalSearchParams();
    const [congratsVisible, setCongratsVisible] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' }>({
        visible: false,
        title: '',
        message: '',
        type: 'success'
    });

    useEffect(() => {
        if (isFirstTime === 'true') {
            setCongratsVisible(true);
        }
    }, [isFirstTime]);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await UserService.getSOSStatus();
            setContacts(data.contacts || []);
        } catch (error) {
            console.error('Error fetching SOS status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = () => {
        if (contacts.length >= 10) {
            Alert.alert("Limit Reached", "You can only add up to 10 emergency contacts.");
            return;
        }
        triggerHaptic();
        setContacts([...contacts, { firstName: '', lastName: '', phoneNumber: '', email: '', relationship: '' }]);
    };

    const handleRemoveContact = (index: number) => {
        triggerHaptic();
        const newContacts = [...contacts];
        newContacts.splice(index, 1);
        setContacts(newContacts);
    };

    const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
        const newContacts = [...contacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setContacts(newContacts);
    };

    const handleSave = async () => {
        // Validation
        for (const contact of contacts) {
            if (!contact.firstName || !contact.lastName || !contact.phoneNumber || !contact.email) {
                setAlert({
                    visible: true,
                    title: "Missing Information",
                    message: "First name, last name, email, and phone number are required for all contacts.",
                    type: 'error'
                });
                return;
            }
        }

        setSaving(true);
        try {
            await UserService.updateSOSContacts(contacts);

            if (refreshProfile) {
                await refreshProfile();
            }

            setAlert({
                visible: true,
                title: "Success",
                message: "Emergency contacts updated successfully.",
                type: 'success'
            });

            // After success alert is dismissed, we should ideally navigate.
            // This is handled via AlertModal' onDismiss or just here
        } catch (error) {
            setAlert({
                visible: true,
                title: "Error",
                message: "Failed to update emergency contacts. Please try again.",
                type: 'error'
            });
        } finally {
            setSaving(false);
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
                {isFirstTime !== 'true' ? (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                ) : <View style={{ width: 36 }} />}
                <Text style={[styles.headerTitle, { color: colors.text }]}>Setup Contacts</Text>
                <View style={{ width: 36 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Contacts</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
                        Add up to 10 trusted contacts who will be notified in case of an emergency.
                    </Text>

                    {contacts.map((contact, index) => (
                        <View key={index} style={[styles.contactCard, { backgroundColor: colors.card }]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.contactNumber, { color: colors.primary }]}>Contact #{index + 1}</Text>
                                <TouchableOpacity onPress={() => handleRemoveContact(index)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="First Name (Required)"
                                placeholderTextColor={colors.subtext}
                                value={contact.firstName}
                                onChangeText={(val) => updateContact(index, 'firstName', val)}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Last Name (Required)"
                                placeholderTextColor={colors.subtext}
                                value={contact.lastName}
                                onChangeText={(val) => updateContact(index, 'lastName', val)}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Phone Number (Required)"
                                placeholderTextColor={colors.subtext}
                                value={contact.phoneNumber}
                                keyboardType="phone-pad"
                                onChangeText={(val) => updateContact(index, 'phoneNumber', val)}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Email (Required)"
                                placeholderTextColor={colors.subtext}
                                value={contact.email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={(val) => updateContact(index, 'email', val)}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Relationship (Optional)"
                                placeholderTextColor={colors.subtext}
                                value={contact.relationship || ''}
                                onChangeText={(val) => updateContact(index, 'relationship', val)}
                            />
                        </View>
                    ))}

                    <TouchableOpacity
                        style={[styles.addButton, { borderColor: colors.primary }]}
                        onPress={handleAddContact}
                    >
                        <Ionicons name="add" size={24} color={colors.primary} />
                        <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Another Contact</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Complete Setup</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <AlertModal
                isVisible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onDismiss={() => {
                    setAlert({ ...alert, visible: false });
                    if (alert.type === 'success') {
                        router.replace('/sos-management');
                    }
                }}
            />

            <AlertModal
                isVisible={congratsVisible}
                title="Congratulations! 🎉"
                message="Your SOS Emergency Alert subscription was successful. To ensure your safety, please add at least three emergency contacts who will be notified in case of an emergency."
                type="success"
                primaryButtonText="Got it"
                onDismiss={() => setCongratsVisible(false)}
            />
        </SafeAreaView>
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
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 32,
    },
    contactCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    contactNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        fontSize: 16,
    },
    addButton: {
        height: 60,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    saveButton: {
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
