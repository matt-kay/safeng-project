import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AdminUserService } from '@/services/sdk/admin-user-service';

export default function AdminUserActivitiesScreen() {
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();
    const { uid } = useLocalSearchParams<{ uid: string }>();

    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (uid) {
            fetchActivities();
        }
    }, [uid]);

    const fetchActivities = async (isRefresh = false, nextCursor?: string) => {
        if (isRefresh) {
            setRefreshing(true);
        } else if (!nextCursor) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const data = await AdminUserService.getUserActivities(uid, 20, nextCursor);
            if (isRefresh || !nextCursor) {
                setActivities(data.logs);
            } else {
                setActivities(prev => [...prev, ...data.logs]);
            }
            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = () => {
        fetchActivities(true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && cursor) {
            fetchActivities(false, cursor);
        }
    };

    const renderActivityItem = ({ item }: { item: any }) => {
        const date = new Date(item.created_at).toLocaleDateString();
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={[styles.activityItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="flash-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.activityDetails}>
                    <Text style={[styles.actionText, { color: colors.text }]}>
                        {item.action?.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text style={[styles.reasonText, { color: colors.subtext }]}>{item.reason}</Text>
                    <Text style={[styles.dateText, { color: colors.subtext }]}>{date} • {time}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'User Activities',
                headerShown: true,
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(item) => item.id}
                    renderItem={renderActivityItem}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Ionicons name="time-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>No activities found</Text>
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
    listContent: {
        paddingVertical: 8,
    },
    activityItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityDetails: {
        flex: 1,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    reasonText: {
        fontSize: 14,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 12,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
