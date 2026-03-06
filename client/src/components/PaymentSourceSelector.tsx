import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface PaymentSourceSelectorProps {
    amount: number;
    mainBalance: number;
    cashbackBalance: number;
    selectedSource: 'main' | 'cashback';
    onSourceSelect: (source: 'main' | 'cashback') => void;
    isLoading?: boolean;
    estimatedCashback?: number;
    onTopUpPress: () => void;
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);
};

export default function PaymentSourceSelector({
    amount,
    mainBalance,
    cashbackBalance,
    selectedSource,
    onSourceSelect,
    isLoading = false,
    estimatedCashback,
    onTopUpPress,
}: PaymentSourceSelectorProps) {

    const renderSourceCard = (
        type: 'main' | 'cashback',
        label: string,
        balance: number,
        icon: any,
        color: string
    ) => {
        const isSelected = selectedSource === type;
        const hasInsufficientFunds = balance < amount;

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isSelected && { borderColor: color, backgroundColor: color + '05' },
                    hasInsufficientFunds && isSelected && styles.errorCard
                ]}
                onPress={() => onSourceSelect(type)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
                        <MaterialCommunityIcons name={icon} size={24} color={color} />
                    </View>
                    {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={color} />
                    )}
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.label}>{label}</Text>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={color} style={styles.loader} />
                    ) : (
                        <Text style={styles.balance}>{formatCurrency(balance)}</Text>
                    )}
                </View>

                {hasInsufficientFunds && isSelected && (
                    <TouchableOpacity style={styles.topUpBadge} onPress={onTopUpPress}>
                        <Text style={styles.topUpText}>Insufficient funds. Top up</Text>
                        <Ionicons name="add-circle" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                )}

                {isSelected && type === 'main' && estimatedCashback !== undefined && estimatedCashback > 0 && (
                    <View style={styles.cashbackInfo}>
                        <Ionicons name="gift-outline" size={14} color="#34C759" />
                        <Text style={styles.cashbackText}>
                            Earn {formatCurrency(estimatedCashback)} cashback
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Select Payment Source</Text>
            <View style={styles.grid}>
                <View style={styles.column}>
                    {renderSourceCard(
                        'main',
                        'Main Balance',
                        mainBalance,
                        'wallet',
                        '#FF9500'
                    )}
                </View>
                <View style={styles.column}>
                    {renderSourceCard(
                        'cashback',
                        'Cashback',
                        cashbackBalance,
                        'gift',
                        '#34C759'
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
    },
    column: {
        flex: 1,
    },
    card: {
        backgroundColor: '#F9F9FB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        minHeight: 140,
        justifyContent: 'space-between',
    },
    errorCard: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        gap: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        textTransform: 'uppercase',
    },
    balance: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    loader: {
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    topUpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    topUpText: {
        fontSize: 11,
        color: '#FF3B30',
        fontWeight: '600',
    },
    cashbackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    cashbackText: {
        fontSize: 11,
        color: '#34C759',
        fontWeight: '600',
    },
});
