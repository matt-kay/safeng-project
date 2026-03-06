import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminUserService, AdminUserStats, TrendPeriod, TrendDataPoint } from '@/services/sdk/admin-user-service';

const PERIODS: { label: string; value: TrendPeriod }[] = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
];

const STAT_CARDS = [
    { key: 'total', label: 'Total Users', icon: 'people' as const, color: '#6366F1' },
    { key: 'customer', label: 'Customers', icon: 'person' as const, color: '#0EA5E9' },
    { key: 'admin', label: 'Admins', icon: 'shield-checkmark' as const, color: '#8B5CF6' },
    { key: 'active', label: 'Active', icon: 'checkmark-circle' as const, color: '#10B981' },
    { key: 'inactive', label: 'Inactive', icon: 'time' as const, color: '#F59E0B' },
    { key: 'suspended', label: 'Suspended', icon: 'ban' as const, color: '#EF4444' },
];

function BarChart({ data, accentColor }: { data: TrendDataPoint[]; accentColor: string }) {
    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
        <View style={chartStyles.container}>
            {data.map((point, idx) => {
                const heightPct = maxCount === 0 ? 0 : point.count / maxCount;
                const barHeight = Math.max(heightPct * 120, point.count > 0 ? 4 : 2);
                return (
                    <View key={idx} style={chartStyles.barWrapper}>
                        <Text style={chartStyles.countLabel}>
                            {point.count > 0 ? point.count : ''}
                        </Text>
                        <View style={chartStyles.barTrack}>
                            <View
                                style={[
                                    chartStyles.bar,
                                    {
                                        height: barHeight,
                                        backgroundColor: point.count > 0 ? accentColor : '#E5E7EB',
                                        opacity: point.count > 0 ? 1 : 0.35,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={chartStyles.barLabel} numberOfLines={1}>
                            {point.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

export default function ManageUsersScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();

    const [stats, setStats] = useState<AdminUserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<TrendPeriod>('month');
    const [trendLoading, setTrendLoading] = useState(false);

    const fetchStats = useCallback(async (p: TrendPeriod, isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (!stats) setLoading(true);
            else setTrendLoading(true);
            setError(null);
            const data = await AdminUserService.getUserStats(p);
            setStats(data);
        } catch (e: any) {
            setError('Failed to load user statistics. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setTrendLoading(false);
        }
    }, [stats]);

    useEffect(() => {
        fetchStats(period);
    }, []);

    const handlePeriodChange = (p: TrendPeriod) => {
        triggerHaptic();
        setPeriod(p);
        fetchStats(p);
    };

    const handleRefresh = () => {
        fetchStats(period, true);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{
                    headerShown: true,
                    title: 'Manage Users',
                    headerStyle: { backgroundColor: colors.card },
                    headerTintColor: colors.text,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                }} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.subtext }]}>
                        Loading user data…
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Manage Users',
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
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {error ? (
                    <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
                        <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                            onPress={() => fetchStats(period)}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : stats ? (
                    <>
                        {/* ─── Stats Grid ─── */}
                        <Text style={styles.sectionTitle}>Overview</Text>
                        <View style={styles.grid}>
                            {STAT_CARDS.map((card) => (
                                <TouchableOpacity
                                    key={card.key}
                                    style={[styles.statCard, { backgroundColor: colors.card }]}
                                    onPress={() => {
                                        triggerHaptic();
                                        router.push({
                                            pathname: '/admin/user-list',
                                            params: {
                                                filterType: ['customer', 'admin'].includes(card.key) ? 'role' : ['active', 'inactive', 'suspended'].includes(card.key) ? 'status' : undefined,
                                                filterValue: card.key === 'total' ? undefined : card.key,
                                                title: card.label
                                            }
                                        });
                                    }}
                                >
                                    <View style={[styles.iconBadge, { backgroundColor: card.color + '22' }]}>
                                        <Ionicons name={card.icon} size={22} color={card.color} />
                                    </View>
                                    <Text style={[styles.statCount, { color: colors.text }]}>
                                        {stats[card.key as keyof AdminUserStats] as number}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: colors.subtext }]}>
                                        {card.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ─── Sign-Up Trend Chart ─── */}
                        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Sign-Up Trends</Text>
                        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                            {/* Period filter tabs */}
                            <View style={[styles.tabRow, { backgroundColor: colors.background }]}>
                                {PERIODS.map((p) => (
                                    <TouchableOpacity
                                        key={p.value}
                                        style={[
                                            styles.tab,
                                            period === p.value && { backgroundColor: colors.primary },
                                        ]}
                                        onPress={() => handlePeriodChange(p.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.tabText,
                                                { color: period === p.value ? '#fff' : colors.subtext },
                                            ]}
                                        >
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Chart */}
                            {trendLoading ? (
                                <View style={styles.chartLoading}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : stats.trend.length === 0 ? (
                                <View style={styles.chartLoading}>
                                    <Text style={[styles.noDataText, { color: colors.subtext }]}>
                                        No data for this period
                                    </Text>
                                </View>
                            ) : (
                                <BarChart data={stats.trend} accentColor={colors.primary ?? '#6366F1'} />
                            )}

                            {/* Summary line */}
                            <View style={[styles.summaryRow, { borderTopColor: colors.border }]}>
                                <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
                                <Text style={[styles.summaryText, { color: colors.subtext }]}>
                                    {stats.trend.reduce((a, b) => a + b.count, 0)} new sign-ups
                                    {period === 'day' ? ' today' : period === 'week' ? ' this week' : period === 'month' ? ' this month' : ' this year'}
                                </Text>
                            </View>
                        </View>
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const chartStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 4,
        minHeight: 150,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    countLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 2,
    },
    barTrack: {
        width: '65%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: 120,
    },
    bar: {
        width: '100%',
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: '47%',
        borderRadius: 16,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statCount: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    chartCard: {
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    tabRow: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        gap: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 9,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    chartLoading: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 14,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    summaryText: {
        fontSize: 13,
    },
    errorCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    errorText: {
        fontSize: 15,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 4,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
