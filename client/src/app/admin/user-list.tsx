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
import { AdminUserService, UserListItem } from '@/services/sdk/admin-user-service';
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

export default function UserListScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const { filterType, filterValue, title } = useLocalSearchParams<{
        filterType?: 'role' | 'status';
        filterValue?: string;
        title?: string;
    }>();

    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async (pageNum: number, isRefresh = false, searchQuery = '') => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            setError(null);
            const response = await AdminUserService.listUsers({
                page: pageNum,
                limit: 20,
                filterType,
                filterValue,
                search: searchQuery,
            });

            if (isRefresh || pageNum === 1) {
                setUsers(response.users);
            } else {
                setUsers(prev => [...prev, ...response.users]);
            }

            setHasMore(response.hasMore);
            setPage(pageNum);
        } catch (e: any) {
            setError('Failed to load users. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [filterType, filterValue]);

    useEffect(() => {
        fetchUsers(1, false, search);
    }, [filterType, filterValue]);

    const handleRefresh = () => {
        fetchUsers(1, true, search);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchUsers(page + 1, false, search);
        }
    };

    const debouncedSearch = useRef(
        debounce((query: string) => {
            fetchUsers(1, false, query);
        }, 500)
    ).current;

    const handleSearchChange = (text: string) => {
        setSearch(text);
        debouncedSearch(text);
    };

    const renderUserItem = ({ item }: { item: UserListItem }) => (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: colors.card }]}
            onPress={() => {
                triggerHaptic();
                router.push(`/admin/user-details?uid=${item.uid}`);
            }}
        >
            <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {item.first_name?.[0]}{item.last_name?.[0]}
                </Text>
            </View>
            <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                        {item.first_name} {item.last_name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.userMeta, { color: colors.subtext }]}>{item.email}</Text>
                <Text style={[styles.userMeta, { color: colors.subtext }]}>{item.phone_number}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
        </TouchableOpacity>
    );

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return '#10B981';
            case 'suspended': return '#EF4444';
            case 'inactive': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: title || 'Users',
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
                        placeholder="Search by name, email or phone..."
                        placeholderTextColor={colors.subtext}
                        value={search}
                        onChangeText={handleSearchChange}
                        autoCorrect={false}
                    />
                    {search !== '' && (
                        <TouchableOpacity onPress={() => handleSearchChange('')}>
                            <Ionicons name="close-circle" size={20} color={colors.subtext} />
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
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={() => fetchUsers(1, false, search)}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.uid}
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
                    ListFooterComponent={() => (
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : !hasMore && users.length > 0 ? (
                            <Text style={[styles.endText, { color: colors.subtext }]}>End of list</Text>
                        ) : null
                    )}
                    ListEmptyComponent={() => (
                        !loading ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={48} color={colors.subtext} />
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>No users found</Text>
                            </View>
                        ) : null
                    )}
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
        fontSize: 16,
        padding: 0,
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    userMeta: {
        fontSize: 13,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    footerLoader: {
        paddingVertical: 20,
    },
    endText: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 13,
    },
    errorText: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 16,
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
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
    },
});
