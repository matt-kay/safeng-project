import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Share,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { Transaction, WalletService } from '@/services/sdk/wallet-service';
import { formatCurrency } from '@/utils/format';
import { StatusBar } from 'expo-status-bar';
import JsonViewer from '@/components/JsonViewer';

export default function TransactionDetailsScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const router = useRouter();
    const params = useLocalSearchParams();
    const [transaction, setTransaction] = React.useState<Transaction | null>(
        params.data ? JSON.parse(params.data as string) : null
    );
    const [loading, setLoading] = React.useState(!transaction && !!params.id);

    React.useEffect(() => {
        if (!transaction && params.id) {
            fetchTransaction(params.id as string);
        }
    }, [params.id]);

    const fetchTransaction = async (id: string) => {
        setLoading(true);
        try {
            const data = await WalletService.getTransaction(id);
            setTransaction(data);
        } catch (error) {
            console.error('Failed to fetch transaction:', error);
            Alert.alert('Error', 'Failed to load transaction details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!transaction) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <Text style={{ color: colors.text }}>Transaction not found</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, marginTop: 16 }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isDark = resolvedTheme === 'dark';
    const isCredit = transaction.direction === 'CREDIT';
    const statusColor = transaction.status === 'success' ? '#34C759' : transaction.status === 'failed' ? '#FF3B30' : '#FF9500';

    const handleShare = async () => {
        triggerHaptic();
        try {
            await Share.share({
                message: `Transaction Receipt\nDescription: ${transaction.description}\nAmount: ${formatCurrency(transaction.amount)}\nReference: ${transaction.id}\nStatus: ${transaction.status}`,
            });
        } catch (error) {
            Alert.alert('Error', 'Could not share the receipt');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => { triggerHaptic(); router.back(); }} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Receipt</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                    <Ionicons name="share-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.receiptContainer}>
                    <View style={[styles.statusIcon, { backgroundColor: statusColor + '20' }]}>
                        <Ionicons
                            name={transaction.status === 'success' ? "checkmark-circle" : transaction.status === 'failed' ? "close-circle" : "time"}
                            size={64}
                            color={statusColor}
                        />
                    </View>

                    <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(transaction.amount)}</Text>
                    <Text style={[styles.statusTextMain, { color: statusColor }]}>
                        {transaction.status.toUpperCase()}
                    </Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailsList}>
                        <DetailRow label="Description" value={transaction.description ?? 'N/A'} color={colors.text} subColor={colors.subtext} />
                        <DetailRow label="Transaction ID" value={transaction.id} color={colors.text} subColor={colors.subtext} />
                        <DetailRow label="Date" value={new Date(transaction.createdAt).toLocaleString()} color={colors.text} subColor={colors.subtext} />
                        <DetailRow label="Type" value={transaction.type.toUpperCase()} color={isCredit ? '#34C759' : '#FF9500'} subColor={colors.subtext} />

                        {transaction.type === 'TOP_UP' && transaction.metadata && (
                            <>
                                <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
                                {transaction.metadata.amountUsd !== undefined && (
                                    <DetailRow
                                        label="Amount in Dollars"
                                        value={`$${transaction.metadata.amountUsd.toFixed(2)}`}
                                        color={colors.text}
                                        subColor={colors.subtext}
                                    />
                                )}
                                {transaction.metadata.exchangeRate !== undefined && (
                                    <DetailRow
                                        label="Exchange Rate"
                                        value={formatCurrency(transaction.metadata.exchangeRate) + '/$'}
                                        color={colors.text}
                                        subColor={colors.subtext}
                                    />
                                )}
                                {transaction.metadata.serviceFeeUsd !== undefined && (
                                    <DetailRow
                                        label="Service Fee"
                                        value={`$${transaction.metadata.serviceFeeUsd.toFixed(2)}`}
                                        color={colors.text}
                                        subColor={colors.subtext}
                                    />
                                )}
                            </>
                        )}

                        {transaction.type === 'PAYMENT' && transaction.metadata && (
                            <>
                                <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
                                {transaction.metadata.serviceID !== undefined && (
                                    <DetailRow
                                        label="Service"
                                        value={transaction.metadata.serviceID.split('-').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')}
                                        color={colors.text}
                                        subColor={colors.subtext}
                                    />
                                )}
                                {transaction.metadata.variation_code !== undefined && (
                                    <DetailRow
                                        label="Package"
                                        value={transaction.metadata.variation_code.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                        color={colors.text}
                                        subColor={colors.subtext}
                                    />
                                )}
                                {transaction.metadata.billersCode !== undefined && (
                                    <DetailRow
                                        label="Beneficiary"
                                        value={transaction.metadata.billersCode}
                                        color={colors.text}
                                        subColor={colors.subtext}
                                    />
                                )}
                                {transaction.metadata.vtpassResponse && (
                                    <>
                                        <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
                                        <Text style={[styles.sectionTitle, { color: colors.subtext, marginBottom: 16 }]}>Service Details</Text>
                                        <JsonViewer data={transaction.metadata.vtpassResponse} />
                                    </>
                                )}
                            </>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.doneButton, { backgroundColor: colors.primary }]}
                        onPress={() => { triggerHaptic(); router.back(); }}
                    >
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function DetailRow({ label, value, color, subColor }: { label: string, value: string, color: string, subColor: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: subColor }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: color }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 24,
    },
    receiptContainer: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    statusIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    amount: {
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 8,
    },
    statusTextMain: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 32,
    },
    divider: {
        width: '100%',
        height: 1,
        marginBottom: 24,
    },
    detailsList: {
        width: '100%',
        gap: 20,
        marginBottom: 40,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    doneButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    doneButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniDivider: {
        height: 1,
        width: '100%',
        marginVertical: 4,
        opacity: 0.5
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 8,
    }
});
