import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { useConfirmation } from '@/context/ConfirmationContext';
import { useSettings } from '@/context/SettingsContext';
import { BlurView } from 'expo-blur';

export function WebConfirmationDialog() {
    const { isVisible, options, hide } = useConfirmation();
    const { colors, resolvedTheme, triggerHaptic } = useSettings();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [isVisible]);

    if (!isVisible || !options) return null;

    const handleConfirm = async () => {
        triggerHaptic();
        await options.onConfirm();
        hide();
    };

    const handleCancel = () => {
        triggerHaptic();
        hide();
    };

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableOpacity
                activeOpacity={1}
                style={styles.backdrop}
                onPress={handleCancel}
            >
                <BlurView
                    intensity={20}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }]} />
            </TouchableOpacity>


            <Animated.View
                style={[
                    styles.dialog,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]}>{options.title}</Text>
                    <Text style={[styles.message, { color: colors.subtext }]}>{options.message}</Text>
                </View>

                <View style={[styles.actions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={handleCancel}
                    >
                        <Text style={[styles.cancelText, { color: colors.subtext }]}>
                            {options.cancelText || 'Cancel'}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={[styles.button, styles.confirmButton]}
                        onPress={handleConfirm}
                    >
                        <Text
                            style={[
                                styles.confirmText,
                                { color: options.isDestructive ? colors.error : colors.primary }
                            ]}
                        >
                            {options.confirmText || 'Confirm'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    dialog: {
        width: Math.min(Dimensions.get('window').width * 0.9, 400),
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    content: {
        padding: 24,
        paddingTop: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        height: 56,
        borderTopWidth: 1,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    confirmButton: {
        backgroundColor: 'transparent',
    },
    cancelText: {
        fontSize: 17,
        fontWeight: '500',
    },
    confirmText: {
        fontSize: 17,
        fontWeight: '600',
    },
    divider: {
        width: 1,
        height: '100%',
    },
});
