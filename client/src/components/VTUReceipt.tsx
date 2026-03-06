import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    ScrollView,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface VTUReceiptProps {
    isVisible: boolean;
    status: 'success' | 'failed' | 'pending';
    serviceType: string;
    amount: number;
    referenceId: string;
    createdAt: string;
    onDone: () => void;
}

export default function VTUReceipt({
    isVisible,
    status,
    serviceType,
    amount,
    referenceId,
    createdAt,
    onDone
}: VTUReceiptProps) {
    const formatAmount = (val: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(val);
    };

    const isSuccess = status === 'success';

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={[styles.statusIcon, !isSuccess && styles.statusIconError]}>
                            <Text style={styles.statusEmoji}>{isSuccess ? '✅' : '❌'}</Text>
                        </View>
                        <Text style={styles.statusTitle}>
                            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
                        </Text>
                        <Text style={styles.statusSubtitle}>
                            {isSuccess
                                ? 'Your transaction has been processed successfully.'
                                : 'Something went wrong with your transaction.'}
                        </Text>
                    </View>

                    <View style={styles.receiptCard}>
                        <View style={styles.amountContainer}>
                            <Text style={styles.amountLabel}>Total Amount</Text>
                            <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
                        </View>

                        <View style={styles.detailsContainer}>
                            <DetailRow label="Service" value={serviceType} />
                            <DetailRow label="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} />
                            <DetailRow label="Date" value={new Date(createdAt).toLocaleString()} />
                            <DetailRow label="Reference" value={referenceId} />
                        </View>

                        <View style={styles.dashedLine} />

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                Thank you for using SafeMe. If you have any issues, please contact support.
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.doneButton} onPress={onDone}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    statusIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    statusIconError: {
        backgroundColor: '#FFEBEE',
    },
    statusEmoji: {
        fontSize: 40,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    statusSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    receiptCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    amountContainer: {
        alignItems: 'center',
        marginBottom: 32,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    amountLabel: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    amountValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    detailsContainer: {
        gap: 16,
        marginBottom: 24,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        color: '#8E8E93',
    },
    detailValue: {
        fontSize: 14,
        color: '#1A1A1A',
        fontWeight: '600',
        maxWidth: '60%',
        textAlign: 'right',
    },
    dashedLine: {
        height: 1,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderStyle: 'dashed',
        marginBottom: 24,
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 18,
    },
    doneButton: {
        backgroundColor: '#FF9500',
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
