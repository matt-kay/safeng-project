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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useSettings } from '@/context/SettingsContext';
import { ReportService, ReportType, ReportLocation } from '@/services/sdk/report-service';
import AlertModal from '@/components/AlertModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Media uploads are now handled via the server

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
    const isDark = resolvedTheme === 'dark';

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

    useEffect(() => {
        fetchLocation();
    }, []);

    const fetchLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setAlert({
                    visible: true,
                    title: 'Permission Denied',
                    message: 'Location permission is required to report a crime. Please enable it in settings.',
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
            setAlert({
                visible: true,
                title: 'Location Error',
                message: 'Failed to fetch your GPS coordinates. Please ensure location is enabled.',
                type: 'error'
            });
        } finally {
            setFetchingLocation(false);
        }
    };

    const pickMedia = async () => {
        if (media.length >= 5) {
            setAlert({
                visible: true,
                title: 'Limit Reached',
                message: 'You can only upload up to 5 media files.',
                type: 'error'
            });
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setAlert({
                visible: true,
                title: 'Permission Denied',
                message: 'Media library permission is required to upload assets.',
                type: 'error'
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const fileSize = asset.fileSize || 0;
            const isVideo = asset.type === 'video';

            // Size validation
            if (!isVideo && fileSize > MAX_IMAGE_SIZE) {
                setAlert({
                    visible: true,
                    title: 'File Too Large',
                    message: 'Images must be smaller than 10MB.',
                    type: 'error'
                });
                return;
            }
            if (isVideo && fileSize > MAX_VIDEO_SIZE) {
                setAlert({
                    visible: true,
                    title: 'File Too Large',
                    message: 'Videos must be smaller than 50MB.',
                    type: 'error'
                });
                return;
            }

            setMedia([...media, {
                uri: asset.uri,
                type: isVideo ? 'video' : 'image',
                fileSize
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

    // uploadFile removed as it's now handled by ReportService.uploadMedia

    const handleSubmit = async () => {
        if (!type || !description || !coords) {
            setAlert({
                visible: true,
                title: 'Missing Info',
                message: 'Please provide report type, description, and ensure location is fetched.',
                type: 'error'
            });
            return;
        }

        if (type === ReportType.OTHER && !otherTitle.trim()) {
            setAlert({
                visible: true,
                title: 'Missing Info',
                message: 'Please provide a title for "Other" report type.',
                type: 'error'
            });
            return;
        }

        // Mandatory location validation
        if (!street.trim() || !lga.trim() || !state.trim()) {
            setAlert({
                visible: true,
                title: 'Missing Info',
                message: 'Street, LGA, and State are mandatory.',
                type: 'error'
            });
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            // Upload media first via server
            const mediaUrls: string[] = [];
            for (let i = 0; i < media.length; i++) {
                const url = await ReportService.uploadMedia(media[i].uri, media[i].type);
                mediaUrls.push(url);
                setUploadProgress(((i + 1) / media.length) * 100);
            }

            await ReportService.createReport({
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
            });

            triggerHaptic();
            setAlert({
                visible: true,
                title: 'Success',
                message: 'Your report has been submitted. Our admin team will perform verification before approval.',
                type: 'success'
            });
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Report an Incident</Text>
                </View>

                {!coords && !fetchingLocation && (
                    <View style={[styles.locationWarning, { backgroundColor: colors.error + '10' }]}>
                        <Ionicons name="warning-outline" size={20} color={colors.error} />
                        <Text style={[styles.locationWarningText, { color: colors.error }]}>
                            Location access is required to submit a report.
                        </Text>
                        <TouchableOpacity onPress={fetchLocation} style={styles.grantAccessButton}>
                            <Text style={{ color: colors.primary, fontWeight: '700' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, isFormDisabled && { opacity: 0.5 }]}
                    pointerEvents={isFormDisabled ? 'none' : 'auto'}
                >
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>What happened?</Text>

                    <TouchableOpacity
                        style={[styles.selectInput, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowTypeModal(true)}
                        disabled={isFormDisabled}
                    >
                        <View style={styles.selectInputContent}>
                            <Ionicons
                                name={REPORT_TYPES.find(t => t.value === type)?.icon as any || "help-circle-outline"}
                                size={24}
                                color={type ? colors.primary : colors.subtext}
                            />
                            <Text style={[styles.selectValue, { color: type ? colors.text : colors.subtext }]}>
                                {selectedTypeLabel}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color={colors.subtext} />
                    </TouchableOpacity>

                    {type === ReportType.OTHER && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14 }]}>Incident Title</Text>
                            <TextInput
                                style={[
                                    styles.titleInput,
                                    {
                                        backgroundColor: colors.card,
                                        color: colors.text,
                                        borderColor: colors.border,
                                    },
                                ]}
                                placeholder="Enter report title..."
                                placeholderTextColor={colors.subtext}
                                value={otherTitle}
                                onChangeText={setOtherTitle}
                                editable={!isFormDisabled}
                            />
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Description</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.card,
                                color: colors.text,
                                borderColor: colors.border,
                            },
                        ]}
                        placeholder="Tell us what happened..."
                        placeholderTextColor={colors.subtext}
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                        editable={!isFormDisabled}
                    />

                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Location Details</Text>
                    <View style={styles.manualLocationGrid}>
                        <View style={styles.manualLocationItem}>
                            <Text style={[styles.inputLabel, { color: colors.subtext }]}>Street/Area *</Text>
                            <TextInput
                                style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Allen Avenue"
                                placeholderTextColor={colors.subtext}
                                value={street}
                                onChangeText={setStreet}
                                editable={!isFormDisabled}
                            />
                        </View>
                        <View style={styles.manualLocationItem}>
                            <Text style={[styles.inputLabel, { color: colors.subtext }]}>Nearest Landmark (Optional)</Text>
                            <TextInput
                                style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Zenith Bank"
                                placeholderTextColor={colors.subtext}
                                value={landmark}
                                onChangeText={setLandmark}
                                editable={!isFormDisabled}
                            />
                        </View>
                    </View>

                    <View style={styles.manualLocationGrid}>
                        <View style={styles.manualLocationItem}>
                            <Text style={[styles.inputLabel, { color: colors.subtext }]}>Local Govt (LGA) *</Text>
                            <TextInput
                                style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Ikeja"
                                placeholderTextColor={colors.subtext}
                                value={lga}
                                onChangeText={setLga}
                                editable={!isFormDisabled}
                            />
                        </View>
                        <View style={styles.manualLocationItem}>
                            <Text style={[styles.inputLabel, { color: colors.subtext }]}>State *</Text>
                            <TextInput
                                style={[styles.manualInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Lagos"
                                placeholderTextColor={colors.subtext}
                                value={state}
                                onChangeText={setState}
                                editable={!isFormDisabled}
                            />
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Media ({media.length}/5)</Text>
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
                                    <Ionicons name="close-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {media.length === 0 && (
                            <TouchableOpacity style={[styles.imagePlaceholder, { borderColor: colors.border }]} onPress={pickMedia}>
                                <Ionicons name="camera-outline" size={32} color={colors.subtext} />
                                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 8 }}>Add Media</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.locationHeader}>
                            <Ionicons name="location" size={20} color={colors.primary} />
                            <Text style={[styles.locationTitle, { color: colors.text }]}>Location</Text>
                            {fetchingLocation && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
                        </View>
                        <Text style={[styles.locationText, { color: colors.subtext }]}>
                            {coords
                                ? `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`
                                : 'Fetching your location...'}
                        </Text>
                        <TouchableOpacity onPress={fetchLocation} style={styles.refreshLocation}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Refresh</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            { backgroundColor: loading ? colors.subtext : colors.primary },
                        ]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#FFF" />
                                {uploadProgress > 0 && (
                                    <Text style={styles.uploadProgressText}>
                                        Uploading... {Math.round(uploadProgress)}%
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Report</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

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
                        router.replace('/');
                    }
                }}
            />
            <Modal
                visible={showTypeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTypeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackground}
                        activeOpacity={1}
                        onPress={() => setShowTypeModal(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Incident Type</Text>
                            <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalList}>
                            {REPORT_TYPES.map((item) => (
                                <TouchableOpacity
                                    key={item.value}
                                    style={[
                                        styles.typeItem,
                                        {
                                            backgroundColor: type === item.value ? colors.primary + '15' : 'transparent',
                                            borderBottomColor: colors.border
                                        }
                                    ]}
                                    onPress={() => {
                                        setType(item.value);
                                        setShowTypeModal(false);
                                        triggerHaptic();
                                    }}
                                >
                                    <Ionicons
                                        name={item.icon as any}
                                        size={22}
                                        color={type === item.value ? colors.primary : colors.text}
                                    />
                                    <Text style={[
                                        styles.typeItemLabel,
                                        {
                                            color: type === item.value ? colors.primary : colors.text,
                                            fontWeight: type === item.value ? '700' : '500'
                                        }
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {type === item.value && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
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
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
    },
    selectInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectValue: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
    titleInput: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        fontSize: 16,
        height: 56,
    },
    input: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        fontSize: 14,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    imagesScroll: {
        flexDirection: 'row',
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
    addButton: {
        padding: 4,
    },
    locationCard: {
        marginTop: 24,
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
    submitButton: {
        marginTop: 32,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 40,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    locationWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 20,
        marginVertical: 10,
        borderRadius: 12,
    },
    locationWarningText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
    },
    grantAccessButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    manualLocationGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    manualLocationItem: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginLeft: 4,
    },
    manualInput: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        fontSize: 14,
        height: 48,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadProgressText: {
        color: '#FFF',
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 48 : 24,
        maxHeight: SCREEN_HEIGHT * 0.7,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalList: {
        paddingHorizontal: 16,
    },
    typeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    typeItemLabel: {
        flex: 1,
        fontSize: 16,
        marginLeft: 16,
    },
});
