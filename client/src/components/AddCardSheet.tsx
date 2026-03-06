import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/context/SettingsContext';
import { WalletService, PaymentCard } from '@/services/sdk/wallet-service';

interface AddCardSheetProps {
    isVisible: boolean;
    onDismiss: () => void;
    onSuccess: (card: PaymentCard) => void;
}

/* ─── Brand detection ───────────────────────────────────────── */
type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

function detectBrand(number: string): CardBrand {
    const n = number.replace(/\s/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6][0-9]|7[01])/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6(?:011|5)/.test(n)) return 'discover';
    return 'unknown';
}

const BRAND_META: Record<CardBrand, { color: string; label: string; icon: string }> = {
    visa: { color: '#1A1F71', label: 'Visa', icon: '💳' },
    mastercard: { color: '#EB001B', label: 'Mastercard', icon: '💳' },
    amex: { color: '#2E77BC', label: 'Amex', icon: '💳' },
    discover: { color: '#FF6600', label: 'Discover', icon: '💳' },
    unknown: { color: '#8E8E93', label: 'Card', icon: '💳' },
};

/* ─── Formatters ────────────────────────────────────────────── */
function formatCardNumber(raw: string, brand: CardBrand): string {
    const digits = raw.replace(/\D/g, '');
    const maxLen = brand === 'amex' ? 15 : 16;
    const trimmed = digits.slice(0, maxLen);
    if (brand === 'amex') {
        // AMEX: 4-6-5
        return trimmed
            .replace(/^(\d{4})(\d{0,6})(\d{0,5})$/, (_, a, b, c) =>
                [a, b, c].filter(Boolean).join(' ')
            );
    }
    return trimmed.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function AddCardSheet({ isVisible, onDismiss, onSuccess }: AddCardSheetProps) {
    const { colors, triggerHaptic } = useSettings();

    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [cardName, setCardName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const expiryRef = useRef<TextInput>(null);
    const cvcRef = useRef<TextInput>(null);
    const nameRef = useRef<TextInput>(null);

    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
        } else {
            slideAnim.setValue(300);
        }
    }, [isVisible]);

    const brand = detectBrand(cardNumber);
    const brandMeta = BRAND_META[brand];
    const cvcMaxLen = brand === 'amex' ? 4 : 3;
    const cardMaxDisplay = brand === 'amex' ? 17 : 19; // with spaces

    const resetForm = () => {
        setCardNumber('');
        setExpiry('');
        setCvc('');
        setCardName('');
        setError(null);
        setSaving(false);
    };

    const handleDismiss = () => {
        resetForm();
        onDismiss();
    };

    const validate = (): string | null => {
        const digits = cardNumber.replace(/\s/g, '');
        if (digits.length < (brand === 'amex' ? 15 : 16)) return 'Please enter a valid card number';
        const parts = expiry.split('/');
        if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) return 'Please enter a valid expiry (MM/YY)';
        if (cvc.length < (brand === 'amex' ? 4 : 3)) return `CVC must be ${cvcMaxLen} digits`;
        if (cardName.trim().length < 2) return 'Please enter the cardholder name';
        return null;
    };

    const handleSave = async () => {
        setError(null);
        const validError = validate();
        if (validError) {
            triggerHaptic();
            setError(validError);
            return;
        }

        const [expMonth, expYear] = expiry.split('/');
        const fullYear = 2000 + parseInt(expYear, 10);

        setSaving(true);
        try {
            // Send raw card details to our server — server tokenizes via Stripe secret key
            const card = await WalletService.tokenizeAndSave({
                number: cardNumber.replace(/\s/g, ''),
                expMonth: parseInt(expMonth, 10),
                expYear: fullYear,
                cvc,
                name: cardName.trim() || undefined,
            });
            triggerHaptic();
            resetForm();
            onSuccess(card);
        } catch (err: any) {
            triggerHaptic();
            setError(err?.message ?? 'Failed to save card. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const formBg = colors.card;
    const inputBg = colors.background;
    const isDark = colors.text === '#FFFFFF';

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent
            onRequestClose={handleDismiss}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableOpacity style={styles.backdrop} onPress={handleDismiss} activeOpacity={1} />

                <Animated.View
                    style={[
                        styles.sheet,
                        { backgroundColor: formBg, transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Handle */}
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View>
                            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add New Card</Text>
                            <Text style={[styles.sheetSubtitle, { color: colors.subtext }]}>Securely saved via Stripe</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={[styles.closeButton, { backgroundColor: inputBg }]}
                            disabled={saving}
                        >
                            <Ionicons name="close" size={18} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Card Preview ── */}
                    <View style={[styles.cardPreview, { backgroundColor: brandMeta.color, shadowColor: brandMeta.color }]}>
                        <View style={styles.cardPreviewTop}>
                            <View style={styles.chipWrap}>
                                <View style={styles.chipInner} />
                            </View>
                            <View style={styles.cardBrandBadge}>
                                <Text style={styles.cardBrandBadgeText}>{brandMeta.label}</Text>
                            </View>
                        </View>
                        <Text style={styles.cardPreviewNumber} numberOfLines={1}>
                            {cardNumber || '•••• •••• •••• ••••'}
                        </Text>
                        <View style={styles.cardPreviewBottom}>
                            <View>
                                <Text style={styles.cardPreviewLabel}>CARDHOLDER</Text>
                                <Text style={styles.cardPreviewValue} numberOfLines={1}>
                                    {cardName.toUpperCase() || '—'}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.cardPreviewLabel}>EXPIRES</Text>
                                <Text style={styles.cardPreviewValue}>{expiry || 'MM/YY'}</Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        style={{ width: '100%' }}
                        contentContainerStyle={styles.formContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Card Number */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Card Number</Text>
                        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: colors.border }]}>
                            <Ionicons name="card-outline" size={18} color={colors.subtext} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="1234 5678 9012 3456"
                                placeholderTextColor={colors.subtext}
                                keyboardType="number-pad"
                                value={cardNumber}
                                maxLength={cardMaxDisplay}
                                onChangeText={(t) => {
                                    setError(null);
                                    const brand = detectBrand(t);
                                    const formatted = formatCardNumber(t, brand);
                                    setCardNumber(formatted);
                                    const limit = brand === 'amex' ? 17 : 19;
                                    if (formatted.length >= limit) expiryRef.current?.focus();
                                }}
                                returnKeyType="next"
                                onSubmitEditing={() => expiryRef.current?.focus()}
                                autoComplete="cc-number"
                                textContentType="creditCardNumber"
                            />
                        </View>

                        {/* Expiry + CVC row */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Expiry</Text>
                                <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="calendar-outline" size={18} color={colors.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        ref={expiryRef}
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="MM/YY"
                                        placeholderTextColor={colors.subtext}
                                        keyboardType="number-pad"
                                        value={expiry}
                                        maxLength={5}
                                        onChangeText={(t) => {
                                            setError(null);
                                            const formatted = formatExpiry(t);
                                            setExpiry(formatted);
                                            if (formatted.length === 5) cvcRef.current?.focus();
                                        }}
                                        returnKeyType="next"
                                        onSubmitEditing={() => cvcRef.current?.focus()}
                                    />
                                </View>
                            </View>
                            <View style={{ width: 14 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.fieldLabel, { color: colors.subtext }]}>CVC</Text>
                                <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: colors.border }]}>
                                    <Ionicons name="lock-closed-outline" size={18} color={colors.subtext} style={styles.inputIcon} />
                                    <TextInput
                                        ref={cvcRef}
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder={brand === 'amex' ? '4 digits' : '3 digits'}
                                        placeholderTextColor={colors.subtext}
                                        keyboardType="number-pad"
                                        value={cvc}
                                        maxLength={cvcMaxLen}
                                        onChangeText={(t) => {
                                            setError(null);
                                            setCvc(t.replace(/\D/g, ''));
                                            if (t.length >= cvcMaxLen) nameRef.current?.focus();
                                        }}
                                        returnKeyType="next"
                                        onSubmitEditing={() => nameRef.current?.focus()}
                                        secureTextEntry
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Cardholder Name */}
                        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Cardholder Name</Text>
                        <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: colors.border }]}>
                            <Ionicons name="person-outline" size={18} color={colors.subtext} style={styles.inputIcon} />
                            <TextInput
                                ref={nameRef}
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Name on card"
                                placeholderTextColor={colors.subtext}
                                autoCapitalize="words"
                                value={cardName}
                                onChangeText={(t) => { setError(null); setCardName(t); }}
                                returnKeyType="done"
                                onSubmitEditing={handleSave}
                                autoComplete="name"
                                textContentType="name"
                            />
                        </View>

                        {/* Error */}
                        {error && (
                            <View style={styles.errorWrap}>
                                <Ionicons name="alert-circle-outline" size={15} color="#FF3B30" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                { backgroundColor: colors.primary },
                                saving && styles.saveButtonDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.saveButtonText}>Save Card Securely</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Stripe trust badge */}
                        <View style={styles.stripeBadge}>
                            <Ionicons name="shield-checkmark-outline" size={13} color={colors.subtext} />
                            <Text style={[styles.stripeBadgeText, { color: colors.subtext }]}>
                                Secured by Stripe · PCI DSS compliant
                            </Text>
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const { height: SCREEN_H } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 12,
        alignItems: 'center',
        maxHeight: SCREEN_H * 0.9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 18,
    },
    sheetHeader: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 22,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    sheetSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Card Preview ───────────────────────────────────────────
    cardPreview: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    cardPreviewTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 22,
    },
    chipWrap: {
        width: 36,
        height: 26,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipInner: {
        width: 20,
        height: 14,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    cardBrandBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    cardBrandBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cardPreviewNumber: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: 18,
        fontVariant: ['tabular-nums'],
    },
    cardPreviewBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardPreviewLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    cardPreviewValue: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // ── Form ───────────────────────────────────────────────────
    formContent: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        width: '100%',
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    errorWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
        backgroundColor: 'rgba(255,59,48,0.08)',
        borderRadius: 10,
        padding: 12,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        marginTop: 24,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    saveButtonDisabled: {
        opacity: 0.7,
        shadowOpacity: 0,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    stripeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 14,
        marginBottom: 4,
    },
    stripeBadgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
