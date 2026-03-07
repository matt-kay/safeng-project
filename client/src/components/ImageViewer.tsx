import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
    images: { uri: string }[];
    imageIndex: number;
    visible: boolean;
    onRequestClose: () => void;
}

export default function ImageViewer({ images, imageIndex, visible, onRequestClose }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(imageIndex);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setCurrentIndex(imageIndex);
    }, [imageIndex]);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e: any) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e: any) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            } else if (Math.abs(e.translationY) > 50 && scale.value === 1) {
                // Handle swipe down to close
                translateY.value = e.translationY;
            }
        })
        .onEnd((e: any) => {
            if (scale.value > 1) {
                savedTranslateX.value = translateX.value;
                savedTranslateY.value = translateY.value;
            } else {
                if (Math.abs(e.translationY) > 100) {
                    runOnJS(onRequestClose)();
                }
                translateY.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const composed = Gesture.Race(pinchGesture, panGesture);

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
            resetPosition();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            resetPosition();
        }
    };

    const resetPosition = () => {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onRequestClose}
        >
            <GestureHandlerRootView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <View style={styles.background}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </View>

                {/* Header Actions */}
                <SafeAreaView style={styles.header}>
                    <TouchableOpacity onPress={onRequestClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.pagination}>
                        <Text style={styles.paginationText}>{currentIndex + 1} / {images.length}</Text>
                    </View>
                </SafeAreaView>

                <GestureDetector gesture={composed}>
                    <Animated.View style={[styles.imageContainer, animatedStyle]}>
                        <Image
                            source={{ uri: images[currentIndex]?.uri }}
                            style={styles.image}
                            contentFit="contain"
                            onLoadStart={() => setLoading(true)}
                            onLoadEnd={() => setLoading(false)}
                        />
                        {loading && (
                            <View style={styles.loader}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}
                    </Animated.View>
                </GestureDetector>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <View style={styles.controls}>
                        <TouchableOpacity
                            onPress={handlePrev}
                            disabled={currentIndex === 0}
                            style={[styles.arrowButton, currentIndex === 0 && styles.disabled]}
                        >
                            <Ionicons name="chevron-back" size={32} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleNext}
                            disabled={currentIndex === images.length - 1}
                            style={[styles.arrowButton, currentIndex === images.length - 1 && styles.disabled]}
                        >
                            <Ionicons name="chevron-forward" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </GestureHandlerRootView>
        </Modal>
    );
}

// Added missing imports for UI
import { Text, SafeAreaView } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    closeButton: {
        padding: 8,
    },
    pagination: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    paginationText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
    },
    arrowButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.2,
    },
});
