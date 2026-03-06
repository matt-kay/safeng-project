import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { ReportService, ReportListItem, ReportType } from '@/services/sdk/report-service';
import AlertModal from '@/components/AlertModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReportDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, triggerHaptic } = useSettings();
    const router = useRouter();

    const [report, setReport] = useState<ReportListItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    useEffect(() => {
        if (id) {
            fetchReport();
        }
    }, [id]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const data = await ReportService.getReport(id);
            setReport(data);
        } catch (error) {
            console.error('Error fetching report:', error);
            setAlert({
                visible: true,
                title: 'Error',
                message: 'Failed to load report details.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Report',
            'Are you sure you want to delete this report? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            await ReportService.deleteReport(id);
                            triggerHaptic();
                            router.back();
                        } catch (error) {
                            console.error('Error deleting report:', error);
                            setAlert({
                                visible: true,
                                title: 'Error',
                                message: 'Failed to delete report.',
                                type: 'error'
                            });
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = () => {
        triggerHaptic();
        // We will pass the report data back to the report-crime screen for editing
        router.push({
            pathname: '/(tabs)/report-crime',
            params: { editId: id }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return '#F59E0B';
            case 'approved': return '#10B981';
            case 'rejected': return '#EF4444';
            case 'resolved': return '#3B82F6';
            default: return colors.subtext;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!report) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Text style={{ color: colors.text }}>Report not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Report Details',
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={handleEdit} style={styles.headerAction}>
                                <Ionicons name="create-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={styles.headerAction}>
                                <Ionicons name="trash-outline" size={24} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.statusSection, { backgroundColor: getStatusColor(report.status) + '15' }]}>
                    <Text style={[styles.statusLabel, { color: getStatusColor(report.status) }]}>
                        Status: {report.status.toUpperCase()}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.subtext }]}>TYPE</Text>
                    <Text style={[styles.value, { color: colors.text }]}>
                        {report.type === ReportType.OTHER ? report.otherTitle : report.type}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.subtext }]}>DESCRIPTION</Text>
                    <Text style={[styles.description, { color: colors.text }]}>{report.description}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.subtext }]}>LOCATION</Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                        <Text style={[styles.value, { color: colors.text, marginLeft: 8 }]}>
                            {report.location.street}, {report.location.lga}, {report.location.state}
                        </Text>
                    </View>
                    {report.location.landmark && (
                        <Text style={[styles.subValue, { color: colors.subtext }]}>
                            Landmark: {report.location.landmark}
                        </Text>
                    )}
                </View>

                {report.media && report.media.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.subtext }]}>MEDIA</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                            {report.media.map((url, index) => (
                                <View key={index} style={styles.mediaWrapper}>
                                    <Image source={{ uri: url }} style={styles.mediaImage} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.subtext }]}>REPORTED ON</Text>
                    <Text style={[styles.value, { color: colors.text }]}>
                        {new Date(report.createdAt).toLocaleString()}
                    </Text>
                </View>
            </ScrollView>

            <AlertModal
                isVisible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onDismiss={() => setAlert({ ...alert, visible: false })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAction: {
        marginLeft: 16,
        padding: 4,
    },
    statusSection: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    value: {
        fontSize: 18,
        fontWeight: '600',
    },
    subValue: {
        fontSize: 14,
        marginTop: 4,
        marginLeft: 28,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaScroll: {
        marginTop: 8,
    },
    mediaWrapper: {
        marginRight: 12,
    },
    mediaImage: {
        width: SCREEN_WIDTH * 0.7,
        height: 200,
        borderRadius: 16,
    },
});
