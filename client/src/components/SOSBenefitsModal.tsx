import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';

interface SOSBenefitsModalProps {
    visible: boolean;
    onClose: () => void;
    onProceed: () => void;
}

export default function SOSBenefitsModal({ visible, onClose, onProceed }: SOSBenefitsModalProps) {
    const { colors, resolvedTheme } = useSettings();
    const isDark = resolvedTheme === 'dark';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.modalView, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>SOS Emergency Alert</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
                            </View>
                        </View>

                        <Text style={[styles.description, { color: colors.subtext }]}>
                            Stay protected with our premium SOS Emergency Alert feature.
                            In case of emergency, alert your trusted contacts with your real-time location.
                        </Text>

                        <View style={styles.benefitItem}>
                            <Ionicons name="people" size={24} color={colors.primary} />
                            <View style={styles.benefitTextContainer}>
                                <Text style={[styles.benefitTitle, { color: colors.text }]}>10 Emergency Contacts</Text>
                                <Text style={[styles.benefitDescription, { color: colors.subtext }]}>
                                    Add up to 10 trusted people to be notified instantly.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.benefitItem}>
                            <Ionicons name="location" size={24} color={colors.primary} />
                            <View style={styles.benefitTextContainer}>
                                <Text style={[styles.benefitTitle, { color: colors.text }]}>Real-time Location Sharing</Text>
                                <Text style={[styles.benefitDescription, { color: colors.subtext }]}>
                                    Contacts receive your exact location for quick assistance.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.benefitItem}>
                            <Ionicons name="flash" size={24} color={colors.primary} />
                            <View style={styles.benefitTextContainer}>
                                <Text style={[styles.benefitTitle, { color: colors.text }]}>Instant Notifications</Text>
                                <Text style={[styles.benefitDescription, { color: colors.subtext }]}>
                                    Alerts are sent via SMS, Email, and Push notifications.
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.priceTag, { backgroundColor: colors.buttonBackground }]}>
                            <Text style={[styles.priceLabel, { color: colors.subtext }]}>Monthly Subscription</Text>
                            <Text style={[styles.priceValue, { color: colors.text }]}>₦42,000 / month</Text>
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.proceedButton, { backgroundColor: colors.primary }]}
                        onPress={onProceed}
                    >
                        <Text style={styles.proceedButtonText}>Subscribe Now</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalView: {
        flex: 1,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        flex: 1,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    benefitTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    benefitTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    benefitDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    priceTag: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    priceLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    proceedButton: {
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    proceedButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
