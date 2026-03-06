import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminUserService, Coupon } from '@/services/sdk/admin-user-service';
import { formatCurrency } from '@/utils/format';

export default function AdminUserCouponsScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const { uid } = useLocalSearchParams<{ uid: string }>();

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (uid) {
            fetchCoupons();
        }
    }, [uid]);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const data = await AdminUserService.getUserCoupons(uid);
            setCoupons(data.coupons);
        } catch (error) {
            console.error('Failed to load coupons:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCoupons();
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return '#10B981';
            case 'paused': return '#F59E0B';
            case 'revoked': return '#EF4444';
            case 'expired': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const renderCouponCard = (coupon: Coupon) => {
        const statusColor = getStatusColor(coupon.status);

        return (
            <View key={coupon.id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.couponName, { color: colors.text }]}>{coupon.name}</Text>
                        <Text style={[styles.couponCode, { color: colors.primary }]}>{coupon.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{coupon.status.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.border }]} />

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Value</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {formatCurrency(coupon.amountPerUse, coupon.currency)}
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Uses</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {coupon.remainingUses} / {coupon.maxUses}
                        </Text>
                    </View>
                </View>

                <View style={styles.footerRow}>
                    <Text style={[styles.dateText, { color: colors.subtext }]}>
                        Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'User Coupons',
                headerShown: true,
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : coupons.length > 0 ? (
                    coupons.map(renderCouponCard)
                ) : (
                    <View style={styles.centered}>
                        <Ionicons name="pricetag-outline" size={64} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No coupons found</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        flexGrow: 1,
    },
    card: {
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    couponName: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    couponCode: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    separator: {
        height: 1,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    footerRow: {
        paddingTop: 4,
    },
    dateText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
});
