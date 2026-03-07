import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    StatusBar,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { ReportService, ReportListItem, ReportType } from '@/services/sdk/report-service';
import AlertModal from '@/components/AlertModal';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import ImageViewer from '@/components/ImageViewer';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown,
    FadeInRight,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReportDetailsScreen() {
    const { id, fromHome } = useLocalSearchParams<{ id: string; fromHome?: string }>();
    const isFromHome = fromHome === 'true';
    const { colors, triggerHaptic, resolvedTheme } = useSettings();
    const router = useRouter();

    const [report, setReport] = useState<ReportListItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [isImageViewerVisible, setImageViewerVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
            // console.log(`[ReportDetails] Fetched report ${id}:`, {
            //     hasMedia: !!data.media,
            //     mediaCount: data.media?.length,
            //     media: data.media
            // });
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

    const mediaList = report?.media || [];

    const isVideo = (url: string) => {
        if (!url || typeof url !== 'string') return false;
        const lowerUrl = url.toLowerCase().split('?')[0];
        return lowerUrl.endsWith('.mp4') ||
            lowerUrl.endsWith('.mov') ||
            lowerUrl.endsWith('.m4v') ||
            url.includes('video');
    };

    const isImage = (url: string) => {
        if (!url || typeof url !== 'string') return false;
        const lowerUrl = url.toLowerCase().split('?')[0];
        const hasImageExt = lowerUrl.endsWith('.jpg') ||
            lowerUrl.endsWith('.jpeg') ||
            lowerUrl.endsWith('.png') ||
            lowerUrl.endsWith('.webp') ||
            url.includes('image');

        // If it's not explicitly a video, and we have nothing else, treat it as an image
        return hasImageExt || !isVideo(url);
    };

    const images = mediaList.filter(isImage);
    const videos = mediaList.filter(isVideo);

    const formattedImages = images.map(url => ({ uri: url }));

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (!report) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Text style={{ color: colors.text }}>Report not found</Text>
                </View>
            </View>
        );
    }

    const firstImage = images.length > 0 ? images[0] : null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" translucent />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Floating Header */}
            <View style={styles.floatingHeader}>
                <BlurView intensity={Platform.OS === 'ios' ? 20 : 80} tint="dark" style={styles.headerBlur}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.headerIconBtn}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        {!isFromHome && (
                            <Animated.Text entering={FadeInDown.delay(100)} style={styles.headerTitle}>
                                CASE #{id.slice(-5).toUpperCase()}
                            </Animated.Text>
                        )}

                        <View style={styles.headerActions}>
                            {!isFromHome && (
                                <>
                                    <TouchableOpacity onPress={handleEdit} style={styles.headerIconBtn}>
                                        <Ionicons name="create-outline" size={20} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleDelete} style={styles.headerIconBtn}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </BlurView>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Visual Hero */}
                <View style={styles.heroWrapper}>
                    {firstImage ? (
                        <Image
                            source={{ uri: firstImage }}
                            style={styles.heroImage}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={[styles.heroPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="shield-checkmark" size={80} color={colors.primary} />
                        </View>
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', colors.background]}
                        locations={[0, 0.4, 1]}
                        style={styles.heroGradient}
                    />

                    <Animated.View entering={FadeInRight.delay(300)} style={styles.heroTitleContainer}>
                        {!isFromHome && (
                            <View style={[styles.premiumStatusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                                <View style={styles.badgeDot} />
                                <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
                            </View>
                        )}
                        <Text style={styles.heroMainTitle}>
                            {report.type === ReportType.OTHER ? report.otherTitle : report.type}
                        </Text>
                        <View style={styles.heroMeta}>
                            <Ionicons name="calendar-clear-outline" size={14} color="#131212" />
                            <Text style={styles.heroMetaText}>
                                {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                            <View style={styles.metaDivider} />
                            <Ionicons name="time-outline" size={14} color="#131212" />
                            <Text style={styles.heroMetaText}>
                                {new Date(report.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </Animated.View>
                </View>

                {/* Overlapping Content */}
                <View style={styles.mainContent}>
                    {/* Description Card */}
                    <Animated.View
                        entering={FadeInDown.delay(400)}
                        style={[styles.premiumCard, { backgroundColor: colors.card }]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconBox, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="document-text" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Incident Description</Text>
                        </View>
                        <Text style={[styles.descriptionText, { color: colors.text }]}>
                            {report.description}
                        </Text>
                    </Animated.View>

                    {/* Location Card */}
                    <Animated.View
                        entering={FadeInDown.delay(500)}
                        style={[styles.premiumCard, { backgroundColor: colors.card }]}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconBox, { backgroundColor: '#3B82F620' }]}>
                                <Ionicons name="location" size={20} color="#3B82F6" />
                            </View>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Location Details</Text>
                        </View>

                        <View style={styles.locationWrapper}>
                            <Text style={[styles.addressText, { color: colors.text }]}>
                                {report.location.street}
                            </Text>
                            <Text style={[styles.addressSubText, { color: colors.subtext }]}>
                                {report.location.lga}, {report.location.state}
                            </Text>

                            {report.location.landmark && (
                                <View style={[styles.landmarkBox, { backgroundColor: colors.background }]}>
                                    <Ionicons name="flag" size={14} color={colors.primary} />
                                    <Text style={[styles.landmarkLabel, { color: colors.subtext }]}>Near:</Text>
                                    <Text style={[styles.landmarkValue, { color: colors.text }]}>{report.location.landmark}</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* Evidence Gallery */}
                    {mediaList.length > 0 && (
                        <Animated.View
                            entering={FadeInDown.delay(600)}
                            style={[styles.premiumCard, { backgroundColor: colors.card, paddingBottom: 8 }]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.cardIconBox, { backgroundColor: colors.primary + '10' }]}>
                                    <Ionicons name="images" size={20} color={colors.primary} />
                                </View>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Gallery & Evidence</Text>
                                {mediaList.length > 0 && (
                                    <View style={styles.debugBadge}>
                                        <Text style={styles.debugBadgeText}>{mediaList.length} ITEMS</Text>
                                    </View>
                                )}
                            </View>

                            {/* Images Carousel-like scroll */}
                            {images.length > 0 && (
                                <View style={styles.galleryWrapper}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        snapToInterval={SCREEN_WIDTH * 0.7 + 12}
                                        decelerationRate="fast"
                                        style={styles.evidenceScroll}
                                        contentContainerStyle={styles.evidenceScrollContent}
                                    >
                                        {images.map((url, index) => (
                                            <TouchableOpacity
                                                key={url}
                                                activeOpacity={0.9}
                                                onPress={() => {
                                                    setCurrentImageIndex(index);
                                                    setImageViewerVisible(true);
                                                }}
                                                style={[styles.galleryItem, { backgroundColor: colors.background }]}
                                            >
                                                <Image source={{ uri: url }} style={styles.galleryImage} contentFit="cover" />
                                                <BlurView intensity={30} tint="dark" style={styles.zoomOverlay}>
                                                    <Ionicons name="expand" size={18} color="#fff" />
                                                </BlurView>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Videos Vertical Stack */}
                            {videos.length > 0 && (
                                <View style={styles.videosWrapper}>
                                    {videos.map((url) => (
                                        <PremiumVideoItem key={url} url={url} colors={colors} />
                                    ))}
                                </View>
                            )}

                            {images.length === 0 && videos.length === 0 && (
                                <View style={styles.noEvidenceBox}>
                                    <Ionicons name="information-circle-outline" size={20} color={colors.subtext} />
                                    <Text style={[styles.noEvidenceText, { color: colors.subtext }]}>
                                        No images or videos reported for this incident.
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            <ImageViewer
                images={formattedImages}
                imageIndex={currentImageIndex}
                visible={isImageViewerVisible}
                onRequestClose={() => setImageViewerVisible(false)}
            />

            <AlertModal
                isVisible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onDismiss={() => setAlert({ ...alert, visible: false })}
            />
        </View>
    );
}

function PremiumVideoItem({ url, colors }: { url: string, colors: any }) {
    const player = useVideoPlayer(url, (player) => {
        player.loop = false;
    });

    return (
        <View style={[styles.premiumVideoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <VideoView
                player={player}
                style={styles.premiumVideoPlayer}
                allowsPictureInPicture
            />
            <View style={styles.videoMetaFooter}>
                <View style={styles.videoMetaLeft}>
                    <View style={styles.playPulse} />
                    <Text style={[styles.videoTypeTag, { color: colors.text }]}>VIDEO EVIDENCE</Text>
                </View>
                <Ionicons name="radio-outline" size={16} color={colors.error} />
            </View>
        </View>
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
    floatingHeader: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    headerBlur: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroWrapper: {
        height: SCREEN_HEIGHT * 0.45,
        width: SCREEN_WIDTH,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    heroTitleContainer: {
        position: 'absolute',
        bottom: 60,
        left: 24,
        right: 24,
    },
    premiumStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginHorizontal: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginRight: 4,
    },
    heroMainTitle: {
        color: '#080303ff',
        fontSize: 34,
        fontWeight: '900',
        lineHeight: 38,
        marginBottom: 12,
    },
    heroMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroMetaText: {
        color: '#131212',
        fontSize: 13,
        fontWeight: '500',
    },
    metaDivider: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 4,
    },
    mainContent: {
        paddingHorizontal: 20,
        marginTop: -40,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    premiumCard: {
        borderRadius: 28,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 26,
        fontWeight: '400',
        opacity: 0.9,
    },
    locationWrapper: {
        gap: 4,
    },
    addressText: {
        fontSize: 20,
        fontWeight: '700',
    },
    addressSubText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    landmarkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    landmarkLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    landmarkValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 10,
        marginBottom: 16,
        marginLeft: 4,
    },
    evidenceContainer: {
        marginTop: 8,
    },
    galleryWrapper: {
        marginLeft: -24,
        marginRight: -24,
        marginBottom: 8,
    },
    evidenceScroll: {
        width: SCREEN_WIDTH - 40,
    },
    evidenceScrollContent: {
        paddingHorizontal: 24,
        gap: 12,
    },
    galleryItem: {
        width: SCREEN_WIDTH * 0.7,
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    zoomOverlay: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    videosWrapper: {
        marginTop: 24,
        gap: 20,
    },
    premiumVideoCard: {
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    premiumVideoPlayer: {
        width: '100%',
        aspectRatio: 16 / 9,
    },
    videoMetaFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    videoMetaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
    },
    videoTypeTag: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    noEvidenceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 8,
        opacity: 0.7,
    },
    noEvidenceText: {
        fontSize: 14,
        fontWeight: '500',
    },
    debugBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 'auto',
    },
    debugBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        opacity: 0.5,
    },
});
