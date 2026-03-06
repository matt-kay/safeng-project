import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, ScrollView, SafeAreaView,
    TouchableOpacity, TextInput, ActivityIndicator, Alert,
    RefreshControl, Share, Platform, Modal, KeyboardAvoidingView,
    Pressable, FlatList, ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { StatusBar } from 'expo-status-bar';
import { CouponService, Coupon, CreateCouponDto } from '@/services/sdk/coupon-service';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';

type Tab = 'my' | 'redeem';

const STATUS_COLOR: Record<string, string> = {
    ACTIVE: '#34C759',
    PAUSED: '#FF9500',
    EXPIRED: '#8E8E93',
    REVOKED: '#FF3B30',
};

function generateIdempotencyKey() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ─── Create Coupon Modal ────────────────────────────────────────────────────

interface CreateModalProps {
    visible: boolean;
    onClose: () => void;
    onCreated: (coupon: Coupon) => void;
    colors: any;
    isDark: boolean;
}

function CreateCouponModal({ visible, onClose, onCreated, colors, isDark }: CreateModalProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [amountPerUse, setAmountPerUse] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [expiresAt, setExpiresAt] = useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const totalFunding = (parseFloat(amountPerUse) || 0) * (parseInt(maxUses, 10) || 0);

    const handleCreate = async () => {
        const amount = parseFloat(amountPerUse);
        const uses = parseInt(maxUses, 10);

        if (!amount || amount <= 0) {
            Alert.alert('Validation', 'Please enter a valid amount per use.');
            return;
        }
        if (!uses || uses < 1) {
            Alert.alert('Validation', 'Max uses must be at least 1.');
            return;
        }
        if (expiresAt <= new Date()) {
            Alert.alert('Validation', 'Expiry date must be in the future.');
            return;
        }

        setLoading(true);
        try {
            const dto: CreateCouponDto = {
                amount_per_use: Math.round(amount * 100), // Naira → Kobo
                max_uses: uses,
                currency: 'NGN',
                expires_at: expiresAt.toISOString(),
                idempotency_key: generateIdempotencyKey(),
            };
            if (name.trim()) dto.name = name.trim();
            if (code.trim()) dto.code = code.trim().toUpperCase();
            const coupon = await CouponService.createCoupon(dto);
            onCreated(coupon);
            // Reset
            setName('');
            setCode('');
            setAmountPerUse('');
            setMaxUses('');
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to create coupon. Check your wallet balance.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) setExpiresAt(date);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
                        <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Create Coupon</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {/* Name */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Name (optional)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                            <Ionicons name="pricetag-outline" size={18} color={colors.icon} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. Birthday Gift"
                                placeholderTextColor={colors.subtext}
                                value={name}
                                onChangeText={setName}
                                returnKeyType="next"
                            />
                        </View>

                        {/* Code */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Custom Code (optional)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                            <Ionicons name="key-outline" size={18} color={colors.icon} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. SAVE1000"
                                placeholderTextColor={colors.subtext}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                                returnKeyType="next"
                            />
                        </View>

                        {/* Amount per use */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Amount Per Use (₦)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                            <Ionicons name="cash-outline" size={18} color={colors.icon} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. 500"
                                placeholderTextColor={colors.subtext}
                                value={amountPerUse}
                                onChangeText={setAmountPerUse}
                                keyboardType="decimal-pad"
                                returnKeyType="next"
                            />
                        </View>

                        {/* Max uses */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Maximum Uses</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                            <Ionicons name="people-outline" size={18} color={colors.icon} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. 10"
                                placeholderTextColor={colors.subtext}
                                value={maxUses}
                                onChangeText={setMaxUses}
                                keyboardType="number-pad"
                                returnKeyType="done"
                            />
                        </View>

                        {/* Expiry */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Expiry Date</Text>
                        <TouchableOpacity
                            style={[styles.inputWrapper, { backgroundColor: colors.card, position: 'relative' }]}
                            onPress={() => Platform.OS !== 'web' && setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color={colors.icon} style={styles.inputIcon} />
                            <Text style={[styles.input, { color: colors.text, paddingTop: 17 }]}>
                                {expiresAt.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                            {Platform.OS === 'web' && (
                                <input
                                    type="date"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        opacity: 0,
                                        width: '100%',
                                        height: '100%',
                                        cursor: 'pointer',
                                    }}
                                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setExpiresAt(new Date(e.target.value));
                                        }
                                    }}
                                />
                            )}
                        </TouchableOpacity>

                        {Platform.OS !== 'web' && showDatePicker && (
                            <DateTimePicker
                                value={expiresAt}
                                mode="date"
                                minimumDate={new Date(Date.now() + 86400000)}
                                onChange={onDateChange}
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            />
                        )}

                        {/* Total funding */}
                        {totalFunding > 0 && (
                            <View style={[styles.totalCard, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                                <Text style={[styles.totalLabel, { color: colors.subtext }]}>Total Funding Amount</Text>
                                <Text style={[styles.totalAmount, { color: colors.primary }]}>
                                    ₦{totalFunding.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </Text>
                                <Text style={[styles.totalHint, { color: colors.subtext }]}>
                                    This amount will be debited from your wallet
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.primaryButton, { opacity: loading ? 0.6 : 1 }]}
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="gift-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.primaryButtonText}>Create &amp; Fund Coupon</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function CouponsScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const router = useRouter();
    const isDark = resolvedTheme === 'dark';

    const [activeTab, setActiveTab] = useState<Tab>('my');
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 20;

    // Redeem state
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [redeemSuccess, setRedeemSuccess] = useState(false);
    const [redeemError, setRedeemError] = useState('');

    const fetchCoupons = useCallback(async (pageNum: number, isRefreshing = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else if (pageNum === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const data = await CouponService.getCoupons(pageNum, LIMIT);
            if (isRefreshing || pageNum === 1) {
                setCoupons(data);
                setHasMore(data.length === LIMIT);
            } else {
                setCoupons(prev => [...prev, ...data]);
                setHasMore(data.length === LIMIT);
            }
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => { fetchCoupons(1); }, [fetchCoupons]);

    const onRefresh = () => {
        setPage(1);
        setHasMore(true);
        fetchCoupons(1, true);
    };

    const loadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchCoupons(nextPage);
        }
    };

    const handleCouponCreated = (coupon: Coupon) => {
        setShowCreateModal(false);
        setCoupons(prev => [coupon, ...prev]);
        triggerHaptic();
    };

    const handleRedeem = async () => {
        const code = redeemCode.trim().toUpperCase();
        if (!code) {
            setRedeemError('Please enter a coupon code.');
            return;
        }
        setRedeemLoading(true);
        setRedeemError('');
        setRedeemSuccess(false);
        try {
            await CouponService.redeemCoupon({
                code,
                idempotency_key: generateIdempotencyKey(),
            });
            setRedeemSuccess(true);
            setRedeemCode('');
            triggerHaptic();
        } catch (error: any) {
            const serverError: string = error?.response?.data?.message ?? '';
            const errorMap: Record<string, string> = {
                ALREADY_REDEEMED: 'You have already redeemed this coupon.',
                COUPON_FULLY_REDEEMED: 'This coupon has been fully redeemed.',
                COUPON_EXPIRED: 'This coupon has expired.',
                COUPON_PAUSED: 'This coupon is currently paused.',
                COUPON_REVOKED: 'This coupon has been revoked.',
                COUPON_NOT_FOUND: 'Coupon not found. Check the code and try again.',
            };
            setRedeemError(errorMap[serverError] || serverError || 'Failed to redeem coupon.');
        } finally {
            setRedeemLoading(false);
        }
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const renderCouponCard = ({ item: coupon }: { item: Coupon }) => {
        const statusColor = STATUS_COLOR[coupon.status] || '#8E8E93';
        const totalFunded = CouponService.totalFunded(coupon);
        const totalRedeemed = CouponService.totalRedeemed(coupon);

        return (
            <TouchableOpacity
                style={[styles.couponCard, { backgroundColor: colors.card }]}
                onPress={() => {
                    triggerHaptic();
                    router.push({ pathname: '/coupon-details', params: { id: coupon.id } });
                }}
            >
                {/* Header row */}
                <View style={styles.couponCardHeader}>
                    <View style={[styles.couponIconWrap, { backgroundColor: '#FF9500' + '18' }]}>
                        <Ionicons name="gift-outline" size={22} color="#FF9500" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.couponName, { color: colors.text }]} numberOfLines={1}>{coupon.name}</Text>
                        <Text style={[styles.couponCode, { color: colors.subtext }]}>{coupon.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{coupon.status}</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={[styles.couponStats, { borderTopColor: colors.border }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {CouponService.formatNaira(coupon.amountPerUse)}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Per Use</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {coupon.remainingUses}/{coupon.maxUses}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Uses Left</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#34C759' }]}>
                            {CouponService.formatNaira(totalFunded)}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Funded</Text>
                    </View>
                </View>

                {/* Expiry */}
                <View style={styles.couponFooter}>
                    <Ionicons name="time-outline" size={13} color={colors.subtext} />
                    <Text style={[styles.expiryText, { color: colors.subtext }]}>
                        Expires {new Date(coupon.expiresAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Coupons</Text>
                    {activeTab === 'my' && (
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => { triggerHaptic(); setShowCreateModal(true); }}
                        >
                            <Ionicons name="add" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                    {activeTab === 'redeem' && <View style={{ width: 40 }} />}
                </View>

                {/* Tab bar */}
                <View style={[styles.tabBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    {(['my', 'redeem'] as Tab[]).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, activeTab === tab && [styles.tabItemActive, { backgroundColor: colors.card }]]}
                            onPress={() => { triggerHaptic(); setActiveTab(tab); setRedeemSuccess(false); setRedeemError(''); }}
                        >
                            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.subtext }]}>
                                {tab === 'my' ? 'My Coupons' : 'Redeem'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* My Coupons Tab */}
            {activeTab === 'my' && (
                <View style={{ flex: 1 }}>
                    {loading && !refreshing ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : coupons.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="gift-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No coupons yet</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                                Create a coupon to gift value to friends
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => { triggerHaptic(); setShowCreateModal(true); }}
                            >
                                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.primaryButtonText}>Create Coupon</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={coupons}
                            renderItem={renderCouponCard}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={renderFooter}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                            }
                        />
                    )}
                </View>
            )}

            {/* Redeem Tab */}
            {activeTab === 'redeem' && (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.redeemContent}>
                        <View style={[styles.redeemCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="ticket-outline" size={48} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
                            <Text style={[styles.redeemTitle, { color: colors.text }]}>Redeem a Coupon</Text>
                            <Text style={[styles.redeemSubtitle, { color: colors.subtext }]}>
                                Enter a coupon code shared with you to add value to your wallet.
                            </Text>

                            <View style={[styles.codeInputWrapper, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: redeemError ? '#FF3B30' : 'transparent' }]}>
                                <TextInput
                                    style={[styles.codeInput, { color: colors.text }]}
                                    placeholder="e.g. SC-7H2K-9QPL-3M8D"
                                    placeholderTextColor={colors.subtext}
                                    value={redeemCode}
                                    onChangeText={(t) => { setRedeemCode(t); setRedeemError(''); setRedeemSuccess(false); }}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    onSubmitEditing={handleRedeem}
                                />
                            </View>

                            {redeemError !== '' && (
                                <View style={styles.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={16} color="#FF3B30" />
                                    <Text style={styles.errorText}>{redeemError}</Text>
                                </View>
                            )}

                            {redeemSuccess && (
                                <View style={styles.successRow}>
                                    <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                                    <Text style={styles.successText}>Coupon redeemed! Value added to your wallet.</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.primaryButton, { opacity: redeemLoading ? 0.6 : 1 }]}
                                onPress={handleRedeem}
                                disabled={redeemLoading}
                            >
                                {redeemLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.primaryButtonText}>Redeem</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            <CreateCouponModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={handleCouponCreated}
                colors={colors}
                isDark={isDark}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: { marginRight: 12, marginLeft: -8 },
    title: { fontSize: 24, fontWeight: 'bold', flex: 1 },
    createButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF9500',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    tabItemActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: { fontSize: 14, fontWeight: '600' },

    // List
    listContent: { padding: 20, flexGrow: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 240, lineHeight: 20 },

    // Coupon card
    couponCard: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    couponCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    couponIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    couponName: { fontSize: 16, fontWeight: '700' },
    couponCode: { fontSize: 12, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    couponStats: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 15, fontWeight: '700' },
    statLabel: { fontSize: 11, marginTop: 2 },
    statDivider: { width: StyleSheet.hairlineWidth },
    couponFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingTop: 0,
        paddingHorizontal: 16,
        gap: 4,
    },
    expiryText: { fontSize: 12 },

    // Redeem tab
    redeemContent: { padding: 24, flexGrow: 1 },
    redeemCard: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    redeemTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    redeemSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    codeInputWrapper: {
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1.5,
    },
    codeInput: { fontSize: 17, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },

    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    errorText: { fontSize: 13, color: '#FF3B30', flex: 1 },
    successRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    successText: { fontSize: 13, color: '#34C759', flex: 1 },

    // Shared button
    primaryButton: {
        height: 54,
        backgroundColor: '#FF9500',
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        padding: 15
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    modalClose: { width: 40, alignItems: 'flex-start' },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalContent: { padding: 24, paddingBottom: 40 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 52,
        marginBottom: 20,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    totalCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    totalLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    totalAmount: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
    totalHint: { fontSize: 12 },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});
