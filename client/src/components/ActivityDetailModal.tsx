import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { AuditLog } from '@/services/sdk/audit-service';
import { BlurView } from 'expo-blur';

interface ActivityDetailModalProps {
    isVisible: boolean;
    onClose: () => void;
    activity: AuditLog | null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ActivityDetailModal({ isVisible, onClose, activity }: ActivityDetailModalProps) {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const isDark = resolvedTheme === 'dark';

    if (!activity) return null;

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

    const theme = getActionTheme(activity.action);
    const date = new Date(activity.created_at);
    const dateString = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Filter out sensitive keys from metadata and diffs
    const SENSITIVE_KEYS = ['uid', 'actor_uid', 'target_uid', 'password', 'token', 'secret', 'id', 'user_id', 'owner_id'];

    const filterData = (data: any) => {
        if (!data || typeof data !== 'object') return data;
        const filtered: Record<string, any> = {};
        Object.keys(data).forEach(key => {
            if (!SENSITIVE_KEYS.includes(key.toLowerCase())) {
                filtered[key] = data[key];
            }
        });
        return Object.keys(filtered).length > 0 ? filtered : null;
    };

    const beforeData = filterData(activity.before);
    const afterData = filterData(activity.after);
    const metadata = filterData(activity.metadata);

    const renderDataSection = (title: string, data: any) => {
        if (!data) return null;

        return (
            <View style={styles.dataSection}>
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{title}</Text>
                <View style={[styles.dataContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    {Object.entries(data).map(([key, value]) => (
                        <View key={key} style={styles.dataRow}>
                            <Text style={[styles.dataKey, { color: colors.subtext }]}>{key.replace(/_/g, ' ')}</Text>
                            <Text style={[styles.dataValue, { color: colors.text }]}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const handleClose = () => {
        triggerHaptic();
        onClose();
    };

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                )}

                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <View style={[styles.content, { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
                    <View style={styles.indicator} />

                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Activity Details</Text>
                        <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.summaryContainer}>
                            <View style={[styles.iconWrapper, { backgroundColor: theme.color + '15' }]}>
                                <Ionicons name={theme.icon as any} size={32} color={theme.color} />
                            </View>
                            <Text style={[styles.actionLabel, { color: theme.color }]}>{theme.label}</Text>
                            <Text style={[styles.actionTitle, { color: colors.text }]}>{activity.action.replace(/_/g, ' ')}</Text>

                            <View style={styles.timeContainer}>
                                <Ionicons name="time-outline" size={16} color={colors.subtext} />
                                <Text style={[styles.timeText, { color: colors.subtext }]}>{dateString} at {timeString}</Text>
                            </View>
                        </View>

                        {activity.reason && (
                            <View style={[styles.reasonCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <Text style={[styles.reasonText, { color: colors.text }]}>{activity.reason}</Text>
                            </View>
                        )}

                        {renderDataSection('Changes', afterData)}
                        {renderDataSection('Previous State', beforeData)}
                        {renderDataSection('Metadata', metadata)}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    content: {
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(150,150,150,0.3)',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    summaryContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    actionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textTransform: 'capitalize',
        marginBottom: 8,
        textAlign: 'center',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    reasonCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    reasonText: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        fontWeight: '500',
    },
    dataSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        paddingLeft: 4,
    },
    dataContainer: {
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150,150,150,0.2)',
    },
    dataKey: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
        flex: 1,
    },
    dataValue: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
        flex: 2,
    },
});
