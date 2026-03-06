import React, { useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions, SafeAreaView, Animated, ViewToken, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/context/OnboardingContext';
import { useSettings } from '@/context/SettingsContext';

const SLIDES = [
    {
        id: '1',
        title: 'Fast',
        description: 'Experience lightning-fast transactions and instant top-ups anytime you need them.',
        icon: 'flash' as const,
    },
    {
        id: '2',
        title: 'Secure',
        description: 'Your payments and data are protected with industry-leading security measures.',
        icon: 'shield-checkmark' as const,
    },
    {
        id: '3',
        title: 'Reliable',
        description: 'Enjoy consistent 24/7 service availability. We are always here when you need us.',
        icon: 'refresh' as const,
    },
];

export default function OnboardingScreen() {
    const { width } = useWindowDimensions();
    const [currentPage, setCurrentPage] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const { completeOnboarding } = useOnboarding();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();

    const isDark = resolvedTheme === 'dark';

    const handleComplete = async () => {
        triggerHaptic();
        await completeOnboarding();
    };

    const handleNext = () => {
        triggerHaptic();
        if (currentPage < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentPage + 1,
                animated: true,
            });
        } else {
            handleComplete();
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setCurrentPage(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: width,
            offset: width * index,
            index,
        }),
        [width]
    );

    const renderItem = useCallback(({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={[styles.slide, { width }]}>
                <Ionicons name={item.icon} size={100} color={colors.primary} style={styles.icon} />
                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>{item.description}</Text>
                </View>
            </View>
        );
    }, [width, colors]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleComplete}>
                    <Text style={[styles.skipText, { color: colors.subtext }]}>Skip</Text>
                </TouchableOpacity>
            </View>

            <Animated.FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                keyExtractor={(item) => item.id}
                scrollEventThrottle={16}
                getItemLayout={getItemLayout}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={false}
                contentContainerStyle={{ flexGrow: 1 }}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, index) => {
                        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.indicator,
                                    { width: dotWidth, opacity, backgroundColor: colors.primary },
                                ]}
                            />
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {currentPage === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        alignItems: 'flex-end',
        height: 60,
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        height: '100%',
    },
    icon: {
        marginBottom: 48,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        alignItems: 'center',
    },
    indicatorContainer: {
        flexDirection: 'row',
        height: 32,
        alignItems: 'center',
        marginBottom: 32,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    button: {
        height: 56,
        width: '100%',
        maxWidth: 400,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    skipText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
