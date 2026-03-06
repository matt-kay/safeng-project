import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, ScrollView, SafeAreaView,
    TouchableOpacity, ActivityIndicator, Alert, Share, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useConfirmation } from '@/context/ConfirmationContext';
import { StatusBar } from 'expo-status-bar';
import { CouponService, CouponDetail, CouponStatus } from '@/services/sdk/coupon-service';
import * as Clipboard from 'expo-clipboard';

const STATUS_COLOR: Record<CouponStatus, string> = {
    ACTIVE: '#34C759',
    PAUSED: '#FF9500',
    EXPIRED: '#8E8E93',
    REVOKED: '#FF3B30',
};

const STATUS_ICON: Record<CouponStatus, string> = {
    ACTIVE: 'checkmark-circle',
    PAUSED: 'pause-circle',
    EXPIRED: 'time',
    REVOKED: 'close-circle',
};

export default function CouponDetailsScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const { confirm } = useConfirmation();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isDark = resolvedTheme === 'dark';

    const [coupon, setCoupon] = useState<CouponDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchCoupon = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await CouponService.getCoupon(id);
            setCoupon(data);
        } catch (error) {
            console.error('Failed to fetch coupon:', error);
            Alert.alert('Error', 'Failed to load coupon details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchCoupon(); }, [fetchCoupon]);

    const handleShare = async () => {
        if (!coupon) return;
        triggerHaptic();
        try {
            await Clipboard.setStringAsync(coupon.code);
            await Share.share({
                message: `Use my BriskVTU coupon code "${coupon.code}" to get ${CouponService.formatNaira(coupon.amountPerUse)} added to your wallet! 🎁`,
                title: `BriskVTU Coupon – ${coupon.name}`,
            });
        } catch (error) {
            // User cancelled share — no-op
        }
    };

    const handleAction = async (action: 'pause' | 'resume' | 'revoke') => {
        if (!coupon) return;
        triggerHaptic();

        if (action === 'revoke') {
            confirm({
                title: 'Revoke Coupon',
                message: 'This coupon will be revoked and any remaining funds will be refunded to your wallet. This action is permanent and cannot be undone.',
                confirmText: 'Revoke',
                isDestructive: true,
                onConfirm: () => executeAction('revoke'),
            });
            return;
        }

        executeAction(action);
    };

    const executeAction = async (action: 'pause' | 'resume' | 'revoke') => {
        if (!coupon) return;

        // Optimistic update
        const originalStatus = coupon.status;
        if (action === 'pause') setCoupon(prev => prev ? { ...prev, status: 'PAUSED' } : prev);
        else if (action === 'resume') setCoupon(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
        else if (action === 'revoke') setCoupon(prev => prev ? { ...prev, status: 'REVOKED' } : prev);

        setActionLoading(action);
        try {
            let updated;
            if (action === 'pause') updated = await CouponService.pauseCoupon(coupon.id);
            else if (action === 'resume') updated = await CouponService.resumeCoupon(coupon.id);
            else updated = await CouponService.revokeCoupon(coupon.id);

            setCoupon((prev: CouponDetail | null) => prev ? { ...prev, ...updated } : prev);
            triggerHaptic();
        } catch (error: any) {
            // Revert optimistic update on failure
            if (action === 'pause' || action === 'resume') {
                setCoupon(prev => prev ? { ...prev, status: originalStatus } : prev);
            }
            const msg = error?.response?.data?.message || `Failed to ${action} coupon.`;
            Alert.alert('Error', msg);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Coupon Details</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={styles.centerFlex}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!coupon) return null;

    const totalFunded = CouponService.totalFunded(coupon);
    const totalRedeemed = CouponService.totalRedeemed(coupon);
    const usedCount = coupon.maxUses - coupon.remainingUses;
    const progressPercent = coupon.maxUses > 0 ? (usedCount / coupon.maxUses) * 100 : 0;
    const isExhausted = coupon.remainingUses <= 0;
    const displayStatus = coupon.status;
    const statusColor = STATUS_COLOR[coupon.status];
    const statusIcon = STATUS_ICON[coupon.status];

    const canPause = coupon.status === 'ACTIVE' && !isExhausted;
    const canResume = coupon.status === 'PAUSED' && !isExhausted;
    const canRevoke = (coupon.status === 'ACTIVE' || coupon.status === 'PAUSED') && !isExhausted;
    const canShare = (coupon.status === 'ACTIVE' || coupon.status === 'PAUSED') && !isExhausted;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{coupon.name}</Text>
                {canShare ? (
                    <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                        <Ionicons name="share-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 36 }} />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status hero card */}
                <View style={[styles.heroCard, { backgroundColor: statusColor + '18', borderColor: statusColor + '30' }]}>
                    <Ionicons name={statusIcon as any} size={36} color={statusColor} />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={[styles.heroStatus, { color: colors.subtext }]}>{coupon.code}</Text>
                        <Text style={[styles.heroCode, { color: statusColor }]}>{displayStatus}</Text>
                    </View>
                    {canShare && (
                        <TouchableOpacity
                            onPress={async () => {
                                triggerHaptic();
                                await Clipboard.setStringAsync(coupon.code);
                                Alert.alert('Copied!', 'Coupon code copied to clipboard.');
                            }}
                            style={[styles.copyButton, { backgroundColor: statusColor + '25' }]}
                        >
                            <Ionicons name="copy-outline" size={16} color={statusColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats grid */}
                <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Usage</Text>

                    {/* Progress bar */}
                    <View style={styles.progressRow}>
                        <Text style={[styles.progressLabel, { color: colors.text }]}>
                            {coupon.remainingUses} of {coupon.maxUses} uses remaining
                        </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                        <View style={[styles.progressFill, { width: `${progressPercent}%` as any, backgroundColor: statusColor }]} />
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {CouponService.formatNaira(coupon.amountPerUse)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Per Use</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: '#34C759' }]}>
                                {CouponService.formatNaira(totalFunded)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Total Funded</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: '#FF3B30' }]}>
                                {CouponService.formatNaira(totalRedeemed)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Redeemed</Text>
                        </View>
                    </View>
                </View>

                {/* Info card */}
                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Details</Text>
                    {[
                        { label: 'Currency', value: coupon.currency },
                        {
                            label: 'Expires',
                            value: new Date(coupon.expiresAt).toLocaleDateString('en-NG', {
                                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                            }),
                        },
                        {
                            label: 'Created',
                            value: new Date(coupon.createdAt).toLocaleDateString('en-NG', {
                                day: '2-digit', month: 'short', year: 'numeric',
                            }),
                        },
                    ].map(({ label, value }) => (
                        <View key={label} style={[styles.infoRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{label}</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
                        </View>
                    ))}
                </View>

                {/* Management actions */}
                {(canPause || canResume || canRevoke) && (
                    <View style={styles.actionsSection}>
                        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Management</Text>

                        {/* Share */}
                        {canShare && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.card }]}
                                onPress={handleShare}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: '#007AFF18' }]}>
                                    <Ionicons name="share-social-outline" size={20} color="#007AFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.actionTitle, { color: colors.text }]}>Share Coupon</Text>
                                    <Text style={[styles.actionDesc, { color: colors.subtext }]}>Share code or copy to clipboard</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
                            </TouchableOpacity>
                        )}

                        {/* Toggle Active Status */}
                        {(canPause || canResume || isExhausted) && coupon.status !== 'REVOKED' && (
                            <View style={[styles.actionButton, { backgroundColor: colors.card, paddingVertical: 12 }]}>
                                <View style={[styles.actionIcon, { backgroundColor: coupon.status === 'ACTIVE' ? '#34C75918' : '#FF950018' }]}>
                                    <Ionicons
                                        name={coupon.status === 'ACTIVE' ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                                        size={22}
                                        color={coupon.status === 'ACTIVE' ? '#34C759' : '#FF9500'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.actionTitle, { color: colors.text }]}>Active Status</Text>
                                        {(actionLoading === 'pause' || actionLoading === 'resume') && (
                                            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                                        )}
                                    </View>
                                    <Text style={[styles.actionDesc, { color: colors.subtext }]}>
                                        {isExhausted
                                            ? 'Maximum uses reached'
                                            : coupon.status === 'ACTIVE'
                                                ? 'Coupon is currently active'
                                                : 'Coupon is currently paused'}
                                    </Text>
                                </View>
                                <Switch
                                    value={coupon.status === 'ACTIVE'}
                                    onValueChange={(value) => handleAction(value ? 'resume' : 'pause')}
                                    disabled={actionLoading !== null || isExhausted}
                                    trackColor={{ false: isDark ? '#3A3A3C' : '#D1D1D6', true: '#34C759' }}
                                    thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                                />
                            </View>
                        )}

                        {/* Revoke */}
                        {canRevoke && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.card, opacity: actionLoading === 'revoke' ? 0.6 : 1 }]}
                                onPress={() => handleAction('revoke')}
                                disabled={actionLoading !== null}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: '#FF3B3018' }]}>
                                    {actionLoading === 'revoke'
                                        ? <ActivityIndicator size="small" color="#FF3B30" />
                                        : <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.actionTitle, { color: '#FF3B30' }]}>Revoke Coupon</Text>
                                    <Text style={[styles.actionDesc, { color: colors.subtext }]}>Revoke coupon and refund unused funds</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: { marginLeft: -8, marginRight: 12 },
    title: { fontSize: 20, fontWeight: '700', flex: 1 },
    shareButton: { width: 36, alignItems: 'flex-end' },
    content: { padding: 20, paddingBottom: 48 },
    centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },

    // Hero
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    heroStatus: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    heroCode: { fontSize: 13, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
    copyButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    // Stats
    statsCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    progressRow: { marginBottom: 8 },
    progressLabel: { fontSize: 14, fontWeight: '600' },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    statsGrid: { flexDirection: 'row' },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 15, fontWeight: '700' },
    statLabel: { fontSize: 11, marginTop: 4 },
    statDivider: { width: StyleSheet.hairlineWidth },

    // Info
    infoCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    infoLabel: { fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: '600' },

    // Actions
    actionsSection: { marginTop: 4 },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
        gap: 14,
    },
    actionIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: { fontSize: 15, fontWeight: '600' },
    actionDesc: { fontSize: 12, marginTop: 2 },
});
