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

interface TopUpProcessingModalProps {
    isVisible: boolean;
    onDismiss: () => void;
    onViewTransaction: () => void;
    amountNgn: number;
}

export default function TopUpProcessingModal({
    isVisible,
    onDismiss,
    onViewTransaction,
    amountNgn
}: TopUpProcessingModalProps) {
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

    const formatNgn = (val: number) =>
        `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
                        <Ionicons name="time" size={48} color={colors.primary} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Payment Initiated</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>
                        Your top-up of <Text style={{ fontWeight: '700', color: colors.text }}>{formatNgn(amountNgn)}</Text> has been initiated and is being processed by Stripe.
                    </Text>

                    <View style={[styles.infoBanner, { backgroundColor: colors.background }]}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.subtext} />
                        <Text style={[styles.infoText, { color: colors.subtext }]}>
                            This may take a moment to reflect in your wallet balance.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            triggerHaptic();
                            onViewTransaction();
                        }}
                    >
                        <Text style={styles.primaryBtnText}>Check Transaction Status</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onDismiss}
                    >
                        <Text style={[styles.closeBtnText, { color: colors.subtext }]}>Close</Text>
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
    infoBanner: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 32,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    primaryBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 8,
    },
    closeBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
