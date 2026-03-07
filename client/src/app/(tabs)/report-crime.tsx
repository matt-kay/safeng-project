import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Dimensions,
    FlatList,
    RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '@/context/SettingsContext';
import { ReportService, ReportType, ReportListItem } from '@/services/sdk/report-service';
import AlertModal from '@/components/AlertModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    fileSize?: number;
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

export default function ReportCrimeScreen() {
    const { colors, triggerHaptic, resolvedTheme } = useSettings();
    const router = useRouter();
    const params = useLocalSearchParams<{ editId?: string }>();

    const [type, setType] = useState<ReportType | null>(null);
    const [otherTitle, setOtherTitle] = useState('');
    const [description, setDescription] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [street, setStreet] = useState('');
    const [lga, setLga] = useState('');
    const [state, setState] = useState('');
    const [landmark, setLandmark] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Reports list state
    const [reports, setReports] = useState<ReportListItem[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    useEffect(() => {
        if (params.editId) {
            handlePrepareEdit(params.editId);
        }
    }, [params.editId]);

    const handlePrepareEdit = async (id: string) => {
        try {
            setLoading(true);
            const reportData = await ReportService.getReport(id);
            setEditId(id);
            setType(reportData.type);
            setOtherTitle(reportData.otherTitle || '');
            setDescription(reportData.description);
            setStreet(reportData.location.street);
            setLga(reportData.location.lga);
            setState(reportData.location.state);
            setLandmark(reportData.location.landmark || '');
            setMedia(reportData.media.map(url => ({ uri: url, type: 'image' })));
            setCoords({ latitude: reportData.location.latitude, longitude: reportData.location.longitude });
            setShowFormModal(true);
        } catch (error) {
            console.error('Error preparing edit:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocation();
        fetchReports(1, false);
    }, []);

    const fetchReports = async (pageNum: number, isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (pageNum === 1) setLoadingReports(true);
            else setLoadingMore(true);

            const response = await ReportService.listReports(pageNum, 10);

            if (isRefresh || pageNum === 1) {
                setReports(response.reports);
            } else {
                setReports(prev => [...prev, ...response.reports]);
            }

            setHasMore(response.hasMore);
            setPage(pageNum);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoadingReports(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = () => {
        fetchReports(1, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loadingReports) {
            fetchReports(page + 1);
        }
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

    const renderReportItem = ({ item }: { item: ReportListItem }) => (
        <TouchableOpacity
            style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
                triggerHaptic();
                router.push({
                    pathname: '/report-details',
                    params: { id: item.id }
                });
            }}
        >
            <View style={styles.reportHeader}>
                <View style={styles.reportTypeContainer}>
                    <Ionicons
                        name={REPORT_TYPES.find(t => t.value === item.type)?.icon as any || "help-circle-outline"}
                        size={20}
                        color={colors.primary}
                    />
                    <Text style={[styles.reportType, { color: colors.text }]}>
                        {item.type === ReportType.OTHER ? item.otherTitle : item.type}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <Text style={[styles.reportDescription, { color: colors.subtext }]} numberOfLines={2}>
                {item.description}
            </Text>

            <View style={styles.reportFooter}>
                <View style={styles.reportLocation}>
                    <Ionicons name="location-outline" size={14} color={colors.subtext} />
                    <Text style={[styles.reportLocationText, { color: colors.subtext }]} numberOfLines={1}>
                        {item.location.street}, {item.location.lga}
                    </Text>
                </View>
                <Text style={[styles.reportDate, { color: colors.subtext }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const fetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setAlert({
                    visible: true,
                    title: 'Permission Denied',
                    message: 'Location permission is required to report a crime.',
                    type: 'error'
                });
                return;
            }

            const currentPosition = await Location.getCurrentPositionAsync({});
            setCoords({
                latitude: currentPosition.coords.latitude,
                longitude: currentPosition.coords.longitude,
            });
        } catch (error) {
            console.error('Error fetching location:', error);
        } finally {
            setFetchingLocation(false);
        }
    };

    const pickMedia = async () => {
        if (media.length >= 5) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setMedia([...media, {
                uri: asset.uri,
                type: asset.type === 'video' ? 'video' : 'image',
                fileSize: asset.fileSize
            }]);
            triggerHaptic();
        }
    };

    const removeMedia = (index: number) => {
        const newMedia = [...media];
        newMedia.splice(index, 1);
        setMedia(newMedia);
        triggerHaptic();
    };

    const handleSubmit = async () => {
        if (!type || !description || !coords || !street || !lga || !state) {
            setAlert({
                visible: true,
                title: 'Missing Info',
                message: 'Please fill all mandatory fields.',
                type: 'error'
            });
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(0);

            const mediaUrls: string[] = [];
            for (let i = 0; i < media.length; i++) {
                // If the media is already a URL (from edit mode), don't re-upload
                if (media[i].uri.startsWith('http')) {
                    mediaUrls.push(media[i].uri);
                } else {
                    const url = await ReportService.uploadMedia(media[i].uri, media[i].type);
                    mediaUrls.push(url);
                }
                setUploadProgress(((i + 1) / media.length) * 100);
            }

            const reportData = {
                type,
                location: {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    street: street.trim(),
                    lga: lga.trim(),
                    state: state.trim(),
                    landmark: landmark.trim() || undefined,
                },
                description,
                media: mediaUrls,
                otherTitle: type === ReportType.OTHER ? otherTitle : undefined,
            };

            if (editId) {
                await ReportService.updateReport(editId, reportData);
            } else {
                await ReportService.createReport(reportData);
            }

            triggerHaptic();
            setAlert({
                visible: true,
                title: 'Success',
                message: editId
                    ? 'Your report has been updated and is pending re-verification.'
                    : 'Your report has been submitted for verification.',
                type: 'success'
            });
            setShowFormModal(false);
            setEditId(null);
            fetchReports(1, true);
        } catch (error) {
            console.error('Error submitting report:', error);
            setAlert({
                visible: true,
                title: 'Error',
                message: 'Failed to submit report. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const selectedTypeLabel = REPORT_TYPES.find(t => t.value === type)?.label || 'Select what happened';
    const isFormDisabled = !coords || fetchingLocation;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View style={{ width: 28 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Report History</Text>
                <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
                    <Ionicons name="refresh" size={24} color={colors.primary} style={{ opacity: refreshing ? 0.5 : 1 }} />
                </TouchableOpacity>
            </View>

            {loadingReports && page === 1 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={reports}
                    renderItem={renderReportItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                    }
                    ListFooterComponent={() => (
                        loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.primary} /> : null
                    )}
                    ListEmptyComponent={() => (
                        !loadingReports ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={64} color={colors.subtext} />
                                <Text style={[styles.emptyText, { color: colors.text }]}>No reports yet</Text>
                                <TouchableOpacity
                                    style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                                    onPress={() => setShowFormModal(true)}
                                >
                                    <Text style={styles.emptyButtonText}>Submit Your First Report</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null
                    )}
                />
            )}

            <Modal visible={showFormModal} animationType="slide" onRequestClose={() => { setShowFormModal(false); setEditId(null); }}>
                <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <View style={styles.modalHeaderClose}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>{editId ? 'Edit Report' : 'New Report'}</Text>
                            <TouchableOpacity onPress={() => { setShowFormModal(false); setEditId(null); }}>
                                <Ionicons name="close" size={28} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.scrollContent}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>What happened?</Text>
                            <TouchableOpacity
                                style={[styles.selectInput, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setShowTypeModal(true)}
                            >
                                <View style={styles.selectInputContent}>
                                    <Ionicons name={REPORT_TYPES.find(t => t.value === type)?.icon as any || "help-circle-outline"} size={24} color={colors.primary} />
                                    <Text style={[styles.selectValue, { color: colors.text }]}>{selectedTypeLabel}</Text>
                                </View>
                                <Ionicons name="chevron-down" size={20} color={colors.subtext} />
                            </TouchableOpacity>

                            {type === ReportType.OTHER && (
                                <TextInput
                                    style={[styles.titleInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginTop: 12 }]}
                                    placeholder="Enter title..."
                                    value={otherTitle}
                                    onChangeText={setOtherTitle}
                                />
                            )}

                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Description</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="Describe what happened..."
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                            />

                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Location</Text>
                            <View style={styles.manualLocationGrid}>
                                <View style={styles.manualLocationItem}>
                                    <TextInput
                                        style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                        placeholder="Street"
                                        placeholderTextColor={colors.subtext}
                                        value={street}
                                        onChangeText={setStreet}
                                    />
                                </View>
                                <View style={styles.manualLocationItem}>
                                    <TextInput
                                        style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                        placeholder="LGA"
                                        placeholderTextColor={colors.subtext}
                                        value={lga}
                                        onChangeText={setLga}
                                    />
                                </View>
                            </View>
                            <View style={styles.manualLocationGrid}>
                                <View style={styles.manualLocationItem}>
                                    <TextInput
                                        style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                        placeholder="State"
                                        placeholderTextColor={colors.subtext}
                                        value={state}
                                        onChangeText={setState}
                                    />
                                </View>
                                <View style={styles.manualLocationItem}>
                                    <TextInput
                                        style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                        placeholder="Landmark (Optional)"
                                        placeholderTextColor={colors.subtext}
                                        value={landmark}
                                        onChangeText={setLandmark}
                                    />
                                </View>
                            </View>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Media ({media.length}/5)</Text>
                                <TouchableOpacity onPress={pickMedia} style={styles.addButton} disabled={isFormDisabled}>
                                    <Ionicons name="add-circle" size={24} color={isFormDisabled ? colors.subtext : colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                                {media.map((item, index) => (
                                    <View key={index} style={styles.imageWrapper}>
                                        {item.type === 'video' ? (
                                            <View style={[styles.videoPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                                <Ionicons name="videocam" size={40} color={colors.primary} />
                                                <Text style={{ color: colors.subtext, fontSize: 10, marginTop: 4 }}>Video</Text>
                                            </View>
                                        ) : (
                                            <Image source={{ uri: item.uri }} style={styles.image} />
                                        )}
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeMedia(index)}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {media.length === 0 && (
                                    <TouchableOpacity
                                        style={[styles.imagePlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}
                                        onPress={pickMedia}
                                    >
                                        <Ionicons name="camera-outline" size={32} color={colors.subtext} />
                                        <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 8 }}>Add Media</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>

                            <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}>
                                <View style={styles.locationHeader}>
                                    <Ionicons name="location" size={20} color={colors.primary} />
                                    <Text style={[styles.locationTitle, { color: colors.text }]}>GPS Coordinates</Text>
                                    {fetchingLocation && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
                                </View>
                                <Text style={[styles.locationText, { color: colors.subtext }]}>
                                    {coords
                                        ? `Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}`
                                        : 'Fetching your location...'}
                                </Text>
                                <TouchableOpacity onPress={fetchLocation} style={styles.refreshLocation}>
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Refresh GPS</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>{editId ? 'Update Report' : 'Submit Report'}</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            {!showFormModal && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => { setShowFormModal(true); triggerHaptic(); }}
                >
                    <Ionicons name="megaphone" size={28} color="#FFF" />
                    <Text style={styles.fabText}>Report</Text>
                </TouchableOpacity>
            )}

            <AlertModal
                isVisible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onDismiss={() => {
                    setAlert({ ...alert, visible: false });
                    if (alert.type === 'success') {
                        setType(null);
                        setOtherTitle('');
                        setDescription('');
                        setMedia([]);
                        setStreet('');
                        setLga('');
                        setState('');
                        setLandmark('');
                        setEditId(null);
                    }
                }}
            />

            <Modal visible={showTypeModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackground} onPress={() => setShowTypeModal(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <ScrollView style={styles.modalList}>
                            {REPORT_TYPES.map(item => (
                                <TouchableOpacity
                                    key={item.value}
                                    style={styles.typeItem}
                                    onPress={() => { setType(item.value); setShowTypeModal(false); }}
                                >
                                    <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                                    <Text style={[styles.typeItemLabel, { color: colors.text }]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20 },
    reportCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    reportTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reportType: { fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    reportDescription: { marginBottom: 12 },
    reportFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    reportLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reportLocationText: { fontSize: 12 },
    reportDate: { fontSize: 12 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontSize: 18, marginVertical: 12 },
    emptyButton: { padding: 16, borderRadius: 12 },
    emptyButtonText: { color: '#FFF', fontWeight: 'bold' },
    modalHeaderClose: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    scrollContent: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold' },
    selectInput: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
    selectInputContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    selectValue: { fontSize: 16 },
    titleInput: { padding: 16, borderRadius: 12, borderWidth: 1 },
    input: { padding: 16, borderRadius: 12, borderWidth: 1, minHeight: 100, textAlignVertical: 'top' },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addButton: {
        padding: 4,
        marginTop: 20,
    },
    imagesScroll: {
        flexDirection: 'row',
        marginTop: 12,
        marginBottom: 4,
    },
    imageWrapper: {
        marginRight: 12,
        position: 'relative',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    videoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        zIndex: 1,
    },
    imagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    locationText: {
        fontSize: 14,
    },
    refreshLocation: {
        marginTop: 12,
        alignSelf: 'flex-end',
    },
    manualLocationGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
    manualLocationItem: { flex: 1 },
    manualInput: { padding: 12, borderRadius: 12, borderWidth: 1 },
    submitButton: { marginTop: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontWeight: 'bold' },
    fab: { position: 'absolute', bottom: 30, right: 20, padding: 16, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 5 },
    fabText: { color: '#FFF', fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalBackground: { ...StyleSheet.absoluteFillObject },
    modalContent: { margin: 20, borderRadius: 16, padding: 20, maxHeight: '80%' },
    modalList: { marginTop: 10 },
    typeItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
    typeItemLabel: { fontSize: 16 },
});
