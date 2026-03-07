import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { ReportListItem, ReportType } from '@/services/sdk/report-service';
import { BlurView } from 'expo-blur';

interface ReportCardProps {
    report: ReportListItem;
    onPress: () => void;
    showActions?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

const REPORT_TYPES = [
    { label: 'Unsafe Driving', value: ReportType.UNSAFE_DRIVING, icon: 'car-outline' },
    { label: 'Driver Misconduct', value: ReportType.DRIVER_MISCONDUCT, icon: 'person-outline' },
    { label: 'Overcharging', value: ReportType.OVERCHARGING, icon: 'cash-outline' },
    { label: 'Route Deviation', value: ReportType.ROUTE_DEVIATION, icon: 'map-outline' },
    { label: 'Vehicle Issue', value: ReportType.VEHICLE_ISSUE, icon: 'construct-outline' },
    { label: 'Harassment', value: ReportType.HARASSMENT, icon: 'hand-left-outline' },
    { label: 'Theft/Robbery', value: ReportType.THEFT_ROBBERY, icon: 'briefcase-outline' },
    { label: 'Other', value: ReportType.OTHER, icon: 'ellipsis-horizontal-outline' },
];

export const ReportCard: React.FC<ReportCardProps> = ({ report, onPress, showActions = true, onEdit, onDelete }) => {
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const isDark = resolvedTheme === 'dark';

    const typeInfo = REPORT_TYPES.find(t => t.value === report.type);
    const reportDate = new Date(report.createdAt);
    const formattedDate = reportDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const formattedTime = reportDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return '#F59E0B';
            case 'approved': return '#10B981';
            case 'rejected': return '#EF4444';
            default: return colors.primary;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={typeInfo?.icon as any || 'help-circle-outline'} size={24} color={colors.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.typeText, { color: colors.text }]}>
                        {report.type === ReportType.OTHER ? report.otherTitle : report.type}
                    </Text>
                    <Text style={[styles.locationText, { color: colors.subtext }]} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} /> {report.location.street}, {report.location.lga}
                    </Text>
                </View>
                {showActions && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>{report.status}</Text>
                    </View>
                )}
            </View>

            {/* {showActions && (
                <View style={styles.caseIdContainer}>
                    <Text style={[styles.caseIdLabel, { color: colors.subtext }]}>Case ID:</Text>
                    <Text style={[styles.caseIdValue, { color: colors.text }]}>{report.id.toUpperCase()}</Text>
                </View>
            )} */}

            <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
                {report.description}
            </Text>

            {report.media && report.media.length > 0 && (
                <View style={styles.mediaContainer}>
                    <Image source={{ uri: report.media[0] }} style={styles.thumbnail} />
                    {report.media.length > 1 && (
                        <View style={styles.mediaBadge}>
                            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.blurBadge}>
                                <Text style={styles.mediaCount}>+{report.media.length - 1}</Text>
                            </BlurView>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.footer}>
                <View>
                    <Text style={[styles.dateText, { color: colors.subtext }]}>{formattedDate}</Text>
                    <Text style={[styles.timeText, { color: colors.subtext }]}>{formattedTime}</Text>
                </View>

                <View style={styles.actionRow}>
                    {showActions && (
                        <>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: colors.primary + '10' }]}
                                onPress={(e) => { e.stopPropagation(); triggerHaptic(); onEdit?.(); }}
                            >
                                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: '#EF444410' }]}
                                onPress={(e) => { e.stopPropagation(); triggerHaptic(); onDelete?.(); }}
                            >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity onPress={onPress} style={styles.viewDetailsButton}>
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Details</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
        marginLeft: 12,
    },
    typeText: {
        fontSize: 16,
        fontWeight: '700',
    },
    locationText: {
        fontSize: 13,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    mediaContainer: {
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    mediaBadge: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        borderRadius: 10,
        overflow: 'hidden',
    },
    blurBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    mediaCount: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 12,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 11,
        marginTop: 2,
    },
    caseIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12,
        alignSelf: 'flex-start',
    },
    caseIdLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginRight: 6,
        textTransform: 'uppercase',
    },
    caseIdValue: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingLeft: 12,
        gap: 4,
    },
});
