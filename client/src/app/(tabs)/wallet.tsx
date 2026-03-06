import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useConfirmation } from '@/context/ConfirmationContext';
import { WalletService, WalletBalance, PaymentCard } from '@/services/sdk/wallet-service';
import AddCardSheet from '@/components/AddCardSheet';
import TopUpSheet from '@/components/TopUpSheet';
import { formatCurrency } from '@/utils/format';
import TopUpProcessingModal from '@/components/TopUpProcessingModal';
import { useRouter } from 'expo-router';

export default function WalletScreen() {
    const { profile } = useAuth();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const { confirm } = useConfirmation();
    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [cards, setCards] = useState<PaymentCard[]>([]);
    const [cardsLoading, setCardsLoading] = useState(true);
    const [balancesHidden, setBalancesHidden] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [lastTopUpResult, setLastTopUpResult] = useState<any>(null);
    const router = useRouter();

    const fetchBalance = async () => {
        setBalanceLoading(true);
        try {
            const balanceData = await WalletService.getBalance();
            setBalance(balanceData);
        } catch (error) {
            console.error('Failed to fetch wallet balance:', error);
        } finally {
            setBalanceLoading(false);
        }
    };

    const fetchCards = async () => {
        setCardsLoading(true);
        try {
            const cardData = await WalletService.listCards();
            setCards(cardData);
        } catch (error) {
            console.error('Failed to fetch cards:', error);
        } finally {
            setCardsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
        fetchCards();
    }, []);

    const isDark = resolvedTheme === 'dark';

    const toggleBalances = () => {
        triggerHaptic();
        setBalancesHidden((prev) => !prev);
    };

    const formatAmount = (amount: number) => formatCurrency(amount);

    const maskedAmount = '₦••••••';

    const handleRefresh = async () => {
        triggerHaptic();
        setRefreshing(true);
        await fetchBalance();
        setRefreshing(false);
    };

    const handleTopUp = () => {
        triggerHaptic();
        setShowTopUp(true);
    };

    const handleTopUpSuccess = async (result: any) => {
        setShowTopUp(false);
        setLastTopUpResult(result);
        setShowProcessingModal(true);
        await fetchBalance();
    };

    const handleAddCard = () => {
        triggerHaptic();
        setShowAddCard(true);
    };

    const handleCardAdded = (newCard: PaymentCard) => {
        setShowAddCard(false);
        setCards(prev => [newCard, ...prev]);
    };

    const handleDeleteCard = (card: PaymentCard) => {
        triggerHaptic();
        confirm({
            title: 'Remove Card',
            message: `Are you sure you want to remove •••• ${card.last4}?`,
            confirmText: 'Remove',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await WalletService.deleteCard(card.id);
                    setCards(prev => prev.filter(c => c.id !== card.id));
                } catch (err) {
                    Alert.alert('Error', 'Could not remove card. Please try again.');
                }
            },
        });
    };

    // Returns a card-network icon name and accent colour
    const cardBrandMeta = (brand: string): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
        switch (brand) {
            case 'visa': return { icon: 'card-outline', color: '#1A1F71' };
            case 'mastercard': return { icon: 'card-outline', color: '#EB001B' };
            case 'amex': return { icon: 'card-outline', color: '#2E77BC' };
            case 'discover': return { icon: 'card-outline', color: '#FF6600' };
            default: return { icon: 'card-outline', color: colors.primary };
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Wallet</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Balance Card ── */}
                <View style={styles.balanceCard}>
                    {/* Top row: label + toggle group */}
                    <View style={styles.balanceCardHeader}>
                        <Text style={styles.balanceCardLabel}>MY WALLET</Text>
                        <View style={styles.toggleGroup}>
                            {/* Refresh */}
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={handleRefresh}
                                accessibilityLabel="Refresh balance"
                                disabled={refreshing || balanceLoading}
                            >
                                {refreshing ? (
                                    <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
                                ) : (
                                    <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.85)" />
                                )}
                            </TouchableOpacity>
                            {/* Hide / show */}
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={toggleBalances}
                                accessibilityLabel={balancesHidden ? 'Show balances' : 'Hide balances'}
                            >
                                <Ionicons
                                    name={balancesHidden ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color="rgba(255,255,255,0.85)"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Main balance — prominent */}
                    <View style={styles.mainBalanceRow}>
                        {balanceLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.mainBalanceValue}>
                                {balancesHidden
                                    ? maskedAmount
                                    : formatAmount(balance?.balance ?? 0)}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.mainBalanceSubLabel}>Main Balance</Text>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Cashback balance */}
                    <View style={styles.cashbackRow}>
                        <View style={styles.cashbackIconWrap}>
                            <Ionicons name="gift-outline" size={14} color="rgba(255,255,255,0.9)" />
                        </View>
                        <Text style={styles.cashbackLabel}>Cashback Balance</Text>
                        {balanceLoading ? (
                            <ActivityIndicator color="rgba(255,255,255,0.8)" size="small" style={{ marginLeft: 'auto' }} />
                        ) : (
                            <Text style={styles.cashbackValue}>
                                {balancesHidden
                                    ? maskedAmount
                                    : formatAmount(balance?.cashbackBalance ?? 0)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* ── Fund Wallet Card ── */}
                <View style={[styles.fundCard, { backgroundColor: colors.card }]}>
                    <View style={styles.fundCardLeft}>
                        <View style={[styles.fundIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.fundCardTitle, { color: colors.text }]}>Fund Wallet</Text>
                            <Text style={[styles.fundCardSubtitle, { color: colors.subtext }]}>
                                Top up via card or bank transfer
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.fundButton, { backgroundColor: colors.primary }]}
                        onPress={handleTopUp}
                        accessibilityLabel="Fund wallet"
                    >
                        <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.fundButtonText}>Top Up</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Saved Cards Card ── */}
                <View style={[styles.savedCardsCard, { backgroundColor: colors.card }]}>
                    {/* Header */}
                    <View style={styles.savedCardsHeader}>
                        <View style={styles.savedCardsHeaderLeft}>
                            <View style={[styles.savedCardsIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                                <Ionicons name="card-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.savedCardsTitle, { color: colors.text }]}>Saved Cards</Text>
                        </View>
                        {/* Add Card – only when < 2 cards */}
                        {!cardsLoading && cards.length < 2 && (
                            <TouchableOpacity
                                style={[styles.addCardButton, { borderColor: colors.primary }]}
                                onPress={handleAddCard}
                                accessibilityLabel="Add payment card"
                            >
                                <Ionicons name="add" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                                <Text style={[styles.addCardButtonText, { color: colors.primary }]}>Add Card</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Card list */}
                    {cardsLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16, marginBottom: 4 }} />
                    ) : cards.length === 0 ? (
                        <View style={styles.noCardsState}>
                            <Ionicons name="card-outline" size={28} color={colors.subtext} style={{ marginBottom: 6 }} />
                            <Text style={[styles.noCardsText, { color: colors.subtext }]}>No saved cards yet</Text>
                            <TouchableOpacity
                                style={[styles.addCardButtonLarge, { backgroundColor: colors.primary }]}
                                onPress={handleAddCard}
                            >
                                <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.addCardButtonLargeText}>Add a Card</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.cardList}>
                            {cards.map((card, index) => {
                                const { icon, color: brandColor } = cardBrandMeta(card.brand);
                                return (
                                    <View
                                        key={card.id}
                                        style={[
                                            styles.cardRow,
                                            { borderTopColor: colors.border ?? `${colors.subtext}20` },
                                            index === 0 && styles.cardRowFirst,
                                        ]}
                                    >
                                        {/* Brand icon */}
                                        <View style={[styles.cardBrandWrap, { backgroundColor: `${brandColor}15` }]}>
                                            <Ionicons name={icon} size={20} color={brandColor} />
                                        </View>

                                        {/* Details */}
                                        <View style={styles.cardDetails}>
                                            <Text style={[styles.cardBrandText, { color: colors.text }]}>
                                                {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.last4}
                                            </Text>
                                            <Text style={[styles.cardExpiry, { color: colors.subtext }]}>
                                                Expires {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                                                {card.isDefault ? '  ·  Default' : ''}
                                            </Text>
                                        </View>

                                        {/* Delete */}
                                        <TouchableOpacity
                                            style={styles.deleteCardButton}
                                            onPress={() => handleDeleteCard(card)}
                                            accessibilityLabel={`Remove card ending ${card.last4}`}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ── Additional Navigation ── */}
                <View style={styles.navSection}>
                    <TouchableOpacity
                        style={[styles.navItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/transactions'); }}
                    >
                        <View style={[styles.navIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                            <Ionicons name="list-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.navLabel, { color: colors.text }]}>Transactions</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navItem, { backgroundColor: colors.card }]}
                        onPress={() => { triggerHaptic(); router.push('/coupons'); }}
                    >
                        <View style={[styles.navIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                            <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.navLabel, { color: colors.text }]}>Coupons</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <AddCardSheet
                isVisible={showAddCard}
                onDismiss={() => setShowAddCard(false)}
                onSuccess={handleCardAdded}
            />

            <TopUpSheet
                isVisible={showTopUp}
                onDismiss={() => setShowTopUp(false)}
                onSuccess={handleTopUpSuccess}
                savedCards={cards}
            />

            <TopUpProcessingModal
                isVisible={showProcessingModal}
                onDismiss={() => setShowProcessingModal(false)}
                onViewTransaction={() => {
                    setShowProcessingModal(false);
                    router.push({
                        pathname: '/transaction-details',
                        params: { id: lastTopUpResult?.transactionId }
                    });
                }}
                amountNgn={lastTopUpResult?.netNgnAmount || 0}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },

    // ── Balance Card ──────────────────────────────────────────
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        // Gradient-like orange background
        backgroundColor: '#E0820A',
        // Depth shadow
        shadowColor: '#E0820A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 12,
        overflow: 'hidden',
    },
    balanceCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    balanceCardLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    toggleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    toggleButton: {
        padding: 4,
    },
    mainBalanceRow: {
        minHeight: 52,
        justifyContent: 'center',
        marginBottom: 2,
    },
    mainBalanceValue: {
        color: '#FFFFFF',
        fontSize: 42,
        fontWeight: '800',
        letterSpacing: -1,
    },
    mainBalanceSubLabel: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 16,
    },
    cashbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cashbackIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cashbackLabel: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        fontWeight: '500',
    },
    cashbackValue: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 'auto',
    },

    // ── Fund Wallet Card ──────────────────────────────────────
    fundCard: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 4,
    },
    fundCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    fundIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fundCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    fundCardSubtitle: {
        fontSize: 12,
        fontWeight: '400',
    },
    fundButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    fundButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // ── Saved Cards ──────────────────────────────────────────
    savedCardsCard: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 4,
    },
    savedCardsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    savedCardsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    savedCardsIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    savedCardsTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    addCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    addCardButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    noCardsState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 4,
    },
    noCardsText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    addCardButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    addCardButtonLargeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    cardList: {
        marginTop: 12,
        gap: 0,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    cardRowFirst: {
        borderTopWidth: 0,
    },
    cardBrandWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardDetails: {
        flex: 1,
    },
    cardBrandText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    cardExpiry: {
        fontSize: 12,
        fontWeight: '400',
    },
    deleteCardButton: {
        padding: 6,
    },

    // ── Additional Navigation ──
    navSection: {
        gap: 12,
        marginBottom: 28,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    navIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    navLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
});
