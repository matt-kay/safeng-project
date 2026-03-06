import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';

interface AlertModalProps {
    isVisible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onDismiss: () => void;
}

export default function AlertModal({
    isVisible,
    title,
    message,
    type = 'info',
    onDismiss
}: AlertModalProps) {
    const { colors, triggerHaptic } = useSettings();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [isVisible]);

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'close-circle';
            default: return 'information-circle';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success': return '#34C759';
            case 'error': return '#FF3B30';
            default: return colors.primary;
        }
    };

    return (
        <Modal visible={isVisible} animationType="none" transparent statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
                <Animated.View style={[
                    styles.content,
                    {
                        backgroundColor: colors.card,
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim
                    }
                ]}>
                    <View style={[styles.iconWrap, { backgroundColor: `${getIconColor()}15` }]}>
                        <Ionicons name={getIcon()} size={48} color={getIconColor()} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>
                        {message}
                    </Text>

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: getIconColor() }]}
                        onPress={() => {
                            triggerHaptic();
                            onDismiss();
                        }}
                    >
                        <Text style={styles.primaryBtnText}>OK</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    content: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    iconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 24,
    },
    primaryBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
