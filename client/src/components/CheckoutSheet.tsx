import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    Platform,
    Dimensions,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { formatCurrency } from '@/utils/format';

interface CheckoutSheetProps {
    isVisible: boolean;
    serviceName: string;
    identifier: string;
    amount: number;
    onConfirm: (pin: string) => void;
    onDismiss: () => void;
    isLoading?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CheckoutSheet({
    isVisible,
    serviceName,
    identifier,
    amount,
    onConfirm,
    onDismiss,
    isLoading = false
}: CheckoutSheetProps) {
    const [pin, setPin] = useState('');

    const handleConfirm = () => {
        if (pin.length === 4) {
            onConfirm(pin);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const formatAmount = (val: number) => formatCurrency(val);

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.dismissArea}
                    onPress={onDismiss}
                    activeOpacity={1}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.sheetContainer}
                >
                    <View style={styles.sheet}>
                        <View style={styles.handle} />

                        <Text style={styles.title}>Confirm Transaction</Text>

                        <View style={styles.detailsCard}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Service</Text>
                                <Text style={styles.detailValue}>{serviceName}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Beneficiary</Text>
                                <Text style={styles.detailValue}>{identifier}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Amount</Text>
                                <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
                            </View>
                        </View>

                        <View style={styles.pinSection}>
                            <Text style={styles.pinLabel}>Enter Transaction PIN</Text>
                            <View style={styles.pinDotsContainer}>
                                {[1, 2, 3, 4].map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.pinDot,
                                            pin.length > i && styles.pinDotFilled
                                        ]}
                                    />
                                ))}
                            </View>
                            <TextInput
                                style={styles.hiddenInput}
                                keyboardType="number-pad"
                                maxLength={4}
                                value={pin}
                                onChangeText={(text) => {
                                    setPin(text.replace(/[^0-9]/g, ''));
                                    if (text.length > pin.length) {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                }}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                (pin.length < 4 || isLoading) && styles.buttonDisabled
                            ]}
                            onPress={handleConfirm}
                            disabled={pin.length < 4 || isLoading}
                        >
                            <Text style={styles.confirmButtonText}>
                                {isLoading ? 'Processing...' : 'Confirm & Pay'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onDismiss}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    sheetContainer: {
        width: '100%',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E5EA',
        borderRadius: 2.5,
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 24,
    },
    detailsCard: {
        width: '100%',
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: '600',
    },
    amountValue: {
        fontSize: 18,
        color: '#FF9500',
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginVertical: 12,
    },
    pinSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    pinLabel: {
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: '600',
        marginBottom: 16,
    },
    pinDotsContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#E5E5EA',
        backgroundColor: '#F8F9FA',
    },
    pinDotFilled: {
        backgroundColor: '#FF9500',
        borderColor: '#FF9500',
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
    },
    confirmButton: {
        backgroundColor: '#FF9500',
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 12,
    },
    buttonDisabled: {
        backgroundColor: '#FFCC80',
        shadowOpacity: 0,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        width: '100%',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: '600',
    },
});
