import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { WalletService, PaymentCard } from '@/services/sdk/wallet-service';

interface TopUpSheetProps {
    isVisible: boolean;
    onDismiss: () => void;
    onSuccess: (result: any) => void;
    savedCards: PaymentCard[];
}

const PRESETS = [10, 20, 50, 100];

export default function TopUpSheet({ isVisible, onDismiss, onSuccess, savedCards }: TopUpSheetProps) {
    const { colors, triggerHaptic } = useSettings();
    const [amountStr, setAmountStr] = useState('');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(
        savedCards.find(c => c.isDefault)?.id || savedCards[0]?.id || null
    );
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<{ exchangeRate: number; topUpFeePercentage: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (isVisible) {
            fetchConfig();
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
        } else {
            slideAnim.setValue(300);
            setAmountStr('');
            setError(null);
        }
    }, [isVisible]);

    useEffect(() => {
        if (savedCards.length > 0 && !selectedCardId) {
            setSelectedCardId(savedCards.find(c => c.isDefault)?.id || savedCards[0].id);
        }
    }, [savedCards]);

    const fetchConfig = async () => {
        try {
            const data = await WalletService.getConfig();
            setConfig(data);
        } catch (err) {
            console.error('Failed to fetch wallet config', err);
        }
    };

    const amountUsd = parseInt(amountStr, 10) || 0;

    const calculations = useMemo(() => {
        if (!config || amountUsd <= 0) return null;
        const feeMultiplier = config.topUpFeePercentage / 100;
        const serviceFeeUsd = amountUsd * feeMultiplier;
        const totalUsd = amountUsd + serviceFeeUsd;
        const netNgn = amountUsd * config.exchangeRate;
        const feeNgn = serviceFeeUsd * config.exchangeRate;

        return {
            serviceFeeUsd,
            totalUsd,
            netNgn,
            feeNgn,
        };
    }, [amountUsd, config]);

    const handleTopUp = async () => {
        if (amountUsd <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (!selectedCardId) {
            setError('Please select a payment method');
            return;
        }

        setError(null);
        setLoading(true);
        triggerHaptic();

        try {
            const result = await WalletService.topUp(amountUsd, selectedCardId);
            // In a real app, we might need to handle 3DS here via Stripe SDK.
            // But based on current architecture, we assume server handles intent creation
            // and maybe client-side confirmation if needed. 
            // For now, we'll mark as success if initiate works (simpler flow).
            triggerHaptic();
            onSuccess(result);
        } catch (err: any) {
            setError(err?.message || 'Failed to initiate top-up');
        } finally {
            setLoading(false);
        }
    };

    const formatNgn = (val: number) =>
        `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const formatUsd = (val: number) =>
        `$${val.toFixed(2)}`;

    return (
        <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onDismiss} statusBarTranslucent>
            <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
                <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}>
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Fund Wallet</Text>
                        <TouchableOpacity onPress={onDismiss} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                            <Ionicons name="close" size={20} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Amount Input Section */}
                        <View style={styles.amountSection}>
                            <Text style={[styles.sectionLabel, { color: colors.subtext }]}>ENTER AMOUNT (USD)</Text>
                            <View style={styles.inputContainer}>
                                <Text style={[styles.currencySymbol, { color: colors.primary }]}>$</Text>
                                <TextInput
                                    style={[styles.amountInput, { color: colors.text }]}
                                    value={amountStr}
                                    onChangeText={(t) => setAmountStr(t.replace(/\D/g, ''))}
                                    placeholder="0"
                                    placeholderTextColor={colors.border}
                                    keyboardType="number-pad"
                                    autoFocus
                                />
                            </View>

                            {/* Presets */}
                            <View style={styles.presetRow}>
                                {PRESETS.map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.presetBtn,
                                            { borderColor: colors.border },
                                            parseInt(amountStr) === p && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => {
                                            triggerHaptic();
                                            setAmountStr(p.toString());
                                        }}
                                    >
                                        <Text style={[
                                            styles.presetText,
                                            { color: colors.text },
                                            parseInt(amountStr) === p && { color: '#FFF' }
                                        ]}>${p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Calculations Breakdown */}
                        {calculations && (
                            <View style={[styles.breakdown, { backgroundColor: colors.background }]}>
                                <View style={styles.breakdownRow}>
                                    <Text style={[styles.breakdownLabel, { color: colors.subtext }]}>Exchange Rate</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>1 USD = {formatNgn(config?.exchangeRate || 0)}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={[styles.breakdownLabel, { color: colors.subtext }]}>Service Fee ({config?.topUpFeePercentage}%)</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>{formatUsd(calculations.serviceFeeUsd)}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.breakdownRow}>
                                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total Charge</Text>
                                    <Text style={[styles.totalValue, { color: colors.primary }]}>{formatUsd(calculations.totalUsd)}</Text>
                                </View>
                                <View style={[styles.creditBanner, { backgroundColor: `${colors.primary}15` }]}>
                                    <Ionicons name="flash" size={14} color={colors.primary} />
                                    <Text style={[styles.creditText, { color: colors.primary }]}>
                                        You will get <Text style={{ fontWeight: '800' }}>{formatNgn(calculations.netNgn)}</Text> in your wallet
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Saved Cards */}
                        <View style={styles.cardSection}>
                            <Text style={[styles.sectionLabel, { color: colors.subtext }]}>PAY WITH</Text>
                            {savedCards.length === 0 ? (
                                <Text style={[styles.noCards, { color: colors.subtext }]}>No saved cards. Add one in the wallet screen first.</Text>
                            ) : (
                                <View style={styles.cardList}>
                                    {savedCards.map((card) => (
                                        <TouchableOpacity
                                            key={card.id}
                                            style={[
                                                styles.cardItem,
                                                { borderColor: colors.border },
                                                selectedCardId === card.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}08` }
                                            ]}
                                            onPress={() => {
                                                triggerHaptic();
                                                setSelectedCardId(card.id);
                                            }}
                                        >
                                            <Ionicons
                                                name={selectedCardId === card.id ? "radio-button-on" : "radio-button-off"}
                                                size={20}
                                                color={selectedCardId === card.id ? colors.primary : colors.subtext}
                                            />
                                            <View style={styles.cardInfo}>
                                                <Text style={[styles.cardTitle, { color: colors.text }]}>
                                                    {card.brand.toUpperCase()} •••• {card.last4}
                                                </Text>
                                                <Text style={[styles.cardSub, { color: colors.subtext }]}>
                                                    Expires {card.expiryMonth}/{card.expiryYear}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <TouchableOpacity
                            style={[styles.fundBtn, { backgroundColor: colors.primary }, (loading || !amountUsd || !selectedCardId) && styles.disabledBtn]}
                            onPress={handleTopUp}
                            disabled={loading || !amountUsd || !selectedCardId}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.fundBtnText}>Fund Wallet</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        minHeight: '60%',
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
    title: { fontSize: 22, fontWeight: '800' },
    closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
    amountSection: { marginBottom: 28 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    currencySymbol: { fontSize: 32, fontWeight: '800', marginRight: 4 },
    amountInput: { fontSize: 48, fontWeight: '800', flex: 1 },
    presetRow: { flexDirection: 'row', gap: 12 },
    presetBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    presetText: { fontSize: 15, fontWeight: '700' },
    breakdown: { borderRadius: 20, padding: 20, marginBottom: 28 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    breakdownLabel: { fontSize: 13, fontWeight: '500' },
    breakdownValue: { fontSize: 13, fontWeight: '600' },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 8 },
    totalLabel: { fontSize: 15, fontWeight: '700' },
    totalValue: { fontSize: 18, fontWeight: '800' },
    creditBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 16, gap: 8 },
    creditText: { fontSize: 13, fontWeight: '600' },
    cardSection: { marginBottom: 32 },
    noCards: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
    cardList: { gap: 12 },
    cardItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 14 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    cardSub: { fontSize: 12, fontWeight: '500' },
    errorText: { color: '#FF3B30', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
    fundBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    fundBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    disabledBtn: { opacity: 0.5 },
});
