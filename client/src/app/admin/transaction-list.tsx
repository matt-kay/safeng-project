import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    TextInput,
    RefreshControl,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminTransactionService, AdminTransactionListItem } from '@/services/sdk/admin-transaction-service';
import { formatCurrency } from '@/utils/format';

function debounce(func: Function, wait: number) {
    let timeout: any;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default function AdminTransactionListScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const { filterType, filterValue, title } = useLocalSearchParams<{
        filterType?: 'status' | 'type' | 'category';
        filterValue?: string;
        title?: string;
    }>();

    const [transactions, setTransactions] = useState<AdminTransactionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    const LIMIT = 20;

    const fetchTransactions = useCallback(async (p: number, s: string, isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (p === 1) setLoading(true);
            else setLoadingMore(true);

            setError(null);
            const data = await AdminTransactionService.getTransactions({
                page: p,
                limit: LIMIT,
                filterType,
                filterValue,
                search: s,
            });

            if (isRefresh || p === 1) {
                setTransactions(data.transactions);
            } else {
                setTransactions(prev => [...prev, ...data.transactions]);
            }
            setHasMore(data.hasMore);
        } catch (e: any) {
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [filterType, filterValue]);

    useEffect(() => {
        fetchTransactions(1, search);
    }, [filterType, filterValue]);

    const handleRefresh = () => {
        setPage(1);
        fetchTransactions(1, search, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchTransactions(nextPage, search);
        }
    };

    const debouncedSearch = useRef(
        debounce((text: string) => {
            setPage(1);
            fetchTransactions(1, text);
        }, 500)
    ).current;

    const handleSearch = (text: string) => {
        setSearch(text);
        debouncedSearch(text);
    };

    const renderTransactionItem = ({ item }: { item: AdminTransactionListItem }) => {
        const isCredit = item.direction === 'CREDIT';
        const statusColor = item.status === 'SUCCESS' ? '#34C759' : item.status === 'FAILED' ? '#FF3B30' : '#FF9500';
        const date = new Date(item.createdAt).toLocaleDateString();
        const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity
                style={[styles.transactionItem, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => {
                    triggerHaptic();
                    router.push(`/admin/transaction-details?id=${item.id}`);
                }}
            >
                <View style={[styles.iconContainer, { backgroundColor: isCredit ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)' }]}>
                    <Ionicons
                        name={isCredit ? "arrow-down" : "arrow-up"}
                        size={20}
                        color={isCredit ? '#34C759' : '#FF9500'}
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                    <Text style={[styles.transactionUser, { color: colors.subtext }]} numberOfLines={1}>
                        {item.userName || 'Unknown User'} • {item.userEmail || ''}
                    </Text>
                    <Text style={[styles.transactionDate, { color: colors.subtext }]}>
                        {date} • {time}
                    </Text>
                </View>
                <View style={styles.transactionAmountContainer}>
                    <Text style={[styles.transactionAmount, { color: isCredit ? '#34C759' : colors.text }]}>
                        {formatCurrency(item.amount, 'NGN', { showSign: true, direction: item.direction })}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: title || 'Transactions',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
                    <Ionicons name="search" size={20} color={colors.subtext} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search ID, User, or Wallet..."
                        placeholderTextColor={colors.subtext}
                        value={search}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={18} color={colors.subtext} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && page === 1 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={() => fetchTransactions(1, search)}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransactionItem}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="swap-horizontal" size={64} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>
                                No transactions found
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        height: '100%',
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 32,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionDescription: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    transactionUser: {
        fontSize: 12,
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: 11,
    },
    transactionAmountContainer: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
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
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
