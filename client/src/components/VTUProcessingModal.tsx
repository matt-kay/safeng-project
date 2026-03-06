import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface VTUProcessingModalProps {
    isVisible: boolean;
    onDismiss: () => void;
    onViewTransactions: () => void;
    amount: number;
    serviceName: string;
    transactionId?: string;
}

export default function VTUProcessingModal({
    isVisible,
    onDismiss,
    onViewTransactions,
    amount,
    serviceName,
    transactionId,
}: VTUProcessingModalProps) {
    const router = useRouter();
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

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <Modal visible={isVisible} animationType="none" transparent statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
                <Animated.View style={[
                    styles.content,
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim
                    }
                ]}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                    </View>

                    <Text style={styles.title}>Transaction Initiated</Text>
                    <Text style={styles.description}>
                        Your purchase of <Text style={styles.highlight}>{formatCurrency(amount)}</Text> for <Text style={styles.highlight}>{serviceName}</Text> has been initiated and is being processed.
                    </Text>

                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle-outline" size={20} color="#666" />
                        <Text style={styles.infoText}>
                            You will receive a notification once the transaction is completed. Cashback will be credited upon success.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => {
                            onDismiss();
                            if (transactionId) {
                                router.push({
                                    pathname: '/transaction-details',
                                    params: { id: transactionId },
                                } as any);
                            } else {
                                onViewTransactions();
                            }
                        }}
                    >
                        <Text style={styles.primaryBtnText}>
                            {transactionId ? 'View Transaction' : 'Check Activities'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onDismiss}
                    >
                        <Text style={styles.closeBtnText}>Done</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

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
        backgroundColor: '#FFFFFF',
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
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 24,
    },
    highlight: {
        fontWeight: '700',
        color: '#1A1A1A',
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: '#F9F9FB',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 32,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
        flex: 1,
    },
    primaryBtn: {
        width: '100%',
        height: 60,
        backgroundColor: '#FF9500',
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
        color: '#666',
        fontWeight: '600',
    },
});
