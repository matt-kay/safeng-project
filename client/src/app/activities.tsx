import React, { useEffect, useState, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AuditService, AuditLog } from '@/services/sdk/audit-service';
import { StatusBar } from 'expo-status-bar';
import ActivityDetailModal from '@/components/ActivityDetailModal';

type SectionHeader = { isHeader: true, title: string, id: string };
type ListItem = AuditLog | SectionHeader;

export default function ActivitiesScreen() {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const router = useRouter();
    const [activities, setActivities] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [selectedActivity, setSelectedActivity] = useState<AuditLog | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const LIMIT = 20;

    const fetchActivities = async (cursor?: string, isRefreshing = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else if (!cursor) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const { logs, nextCursor: newCursor } = await AuditService.getActivities(LIMIT, cursor);

            if (isRefreshing || !cursor) {
                setActivities(logs);
            } else {
                setActivities(prev => [...prev, ...logs]);
            }
            setNextCursor(newCursor);
            setHasMore(!!newCursor);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    const onRefresh = () => {
        setHasMore(true);
        setNextCursor(undefined);
        fetchActivities(undefined, true);
    };

    const loadMore = () => {
        if (!loadingMore && hasMore && !loading && nextCursor) {
            fetchActivities(nextCursor);
        }
    };

    const groupedData = useMemo(() => {
        const sections: ListItem[] = [];
        let lastDateString = '';

        activities.forEach((activity) => {
            const date = new Date(activity.created_at);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let dateString = '';
            if (date.toDateString() === today.toDateString()) {
                dateString = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateString = 'Yesterday';
            } else {
                dateString = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            }

            if (dateString !== lastDateString) {
                sections.push({ isHeader: true, title: dateString, id: `header-${dateString}` });
                lastDateString = dateString;
            }
            sections.push(activity);
        });

        return sections;
    }, [activities]);

    const isDark = resolvedTheme === 'dark';

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const getActionTheme = (action: string) => {
        switch (action) {
            case 'profile_update':
            case 'profile_create':
                return { icon: 'person', color: '#007AFF', label: 'Profile' };
            case 'wallet_initiated':
                return { icon: 'wallet', color: '#34C759', label: 'Wallet' };
            case 'card_attached':
                return { icon: 'card', color: '#5856D6', label: 'Payment' };
            case 'card_removed':
                return { icon: 'trash', color: '#FF3B30', label: 'Payment' };
            case 'topup_initiated':
                return { icon: 'trending-up', color: '#34C759', label: 'Top-up' };
            case 'coupon_created':
                return { icon: 'gift', color: '#FF9500', label: 'Coupon' };
            case 'coupon_redeemed':
                return { icon: 'checkmark-circle', color: '#34C759', label: 'Coupon' };
            case 'coupon_paused':
                return { icon: 'pause-circle', color: '#FFCC00', label: 'Coupon' };
            case 'coupon_resumed':
                return { icon: 'play-circle', color: '#34C759', label: 'Coupon' };
            case 'coupon_revoked':
                return { icon: 'close-circle', color: '#FF3B30', label: 'Coupon' };
            default:
                return { icon: 'notifications', color: colors.subtext, label: 'System' };
        }
    };

    const renderItem = ({ item }: { item: ListItem }) => {
        if ('isHeader' in item) {
            return (
                <View style={[styles.sectionHeader]}>
                    <Text style={[styles.sectionHeaderText, { color: colors.subtext }]}>{item.title}</Text>
                </View>
            );
        }

        const theme = getActionTheme(item.action);
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                    triggerHaptic();
                    setSelectedActivity(item);
                    setModalVisible(true);
                }}
            >
                <View style={[styles.activityItem, { backgroundColor: colors.card }]}>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.color + '15' }]}>
                        <Ionicons name={theme.icon as any} size={20} color={theme.color} />
                    </View>
                    <View style={styles.activityContent}>
                        <View style={styles.activityHeader}>
                            <Text style={[styles.activityLabel, { color: theme.color }]}>{theme.label}</Text>
                            <Text style={[styles.activityTime, { color: colors.subtext }]}>{time}</Text>
                        </View>
                        {item.reason && (
                            <Text style={[styles.activityReason, { color: colors.text }]} numberOfLines={2}>
                                {item.reason}
                            </Text>
                        )}
                        <Text style={[styles.activityAction, { color: colors.subtext }]}>
                            {item.action.replace(/_/g, ' ')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => { triggerHaptic(); router.back(); }} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Recent Activities</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : activities.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                        <Ionicons name="time-outline" size={48} color={colors.subtext} />
                    </View>
                    <Text style={[styles.emptyText, { color: colors.text }]}>No activities yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
                        Your transaction and account updates will appear here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={groupedData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id || ''}
                    contentContainerStyle={styles.listContent}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                />
            )}

            <ActivityDetailModal
                isVisible={modalVisible}
                onClose={() => setModalVisible(false)}
                activity={selectedActivity}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        ...Platform.select({
            ios: {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: 'rgba(0,0,0,0.1)',
            },
            android: {
                elevation: 4,
            }
        })
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    sectionHeader: {
        marginTop: 24,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    activityItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            }
        })
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activityContent: {
        flex: 1,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    activityLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    activityTime: {
        fontSize: 12,
        fontWeight: '500',
    },
    activityReason: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 4,
    },
    activityAction: {
        fontSize: 13,
        fontWeight: '500',
        textTransform: 'capitalize',
        opacity: 0.8,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    footerLoader: {
        paddingVertical: 24,
        alignItems: 'center',
    },
});
