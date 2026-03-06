import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, FlatList, Platform } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

export interface Country {
    name: string;
    code: string;
    flag: string;
    format: string;
}

export const COUNTRIES: Country[] = [
    { name: 'Nigeria', code: '+234', flag: '🇳🇬', format: '000 000 0000' },
    { name: 'Ghana', code: '+233', flag: '🇬🇭', format: '00 000 0000' },
    { name: 'South Africa', code: '+27', flag: '🇿🇦', format: '00 000 0000' },
    { name: 'Kenya', code: '+254', flag: '🇰🇪', format: '000 000 000' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧', format: '0000 000000' },
    { name: 'United States', code: '+1', flag: '🇺🇸', format: '000 000 0000' },
];

interface PhoneInputProps {
    phoneNumber: string;
    setPhoneNumber: (text: string) => void;
    selectedCountry: Country;
    setSelectedCountry: (country: Country) => void;
    autoFocus?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    phoneNumber,
    setPhoneNumber,
    selectedCountry,
    setSelectedCountry,
    autoFocus = false
}) => {
    const [showCountryModal, setShowCountryModal] = useState(false);
    const { colors, triggerHaptic } = useSettings();

    const formatPhoneNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        setPhoneNumber(cleaned);
    };

    const getDisplayName = () => {
        if (!phoneNumber) return '';
        let result = '';
        let phoneIdx = 0;
        const format = selectedCountry.format;
        for (let i = 0; i < format.length && phoneIdx < phoneNumber.length; i++) {
            if (format[i] === '0') {
                result += phoneNumber[phoneIdx++];
            } else {
                result += format[i];
            }
        }
        return result;
    };

    return (
        <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
            <View style={[styles.phoneInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.countryPicker}
                    onPress={() => { triggerHaptic(); setShowCountryModal(true); }}
                >
                    <Text style={[styles.countryCode, { color: colors.text }]}>{selectedCountry.flag} {selectedCountry.code}</Text>
                    <Text style={[styles.dropdownIcon, { color: colors.subtext }]}>▾</Text>
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={selectedCountry.format}
                    placeholderTextColor={colors.subtext + '80'}
                    keyboardType="phone-pad"
                    value={getDisplayName()}
                    onChangeText={formatPhoneNumber}
                    autoFocus={autoFocus}
                />
            </View>

            <Modal
                visible={showCountryModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Country</Text>
                            <TouchableOpacity onPress={() => { triggerHaptic(); setShowCountryModal(false); }}>
                                <Text style={[styles.closeButton, { color: colors.subtext }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={COUNTRIES}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.countryItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        triggerHaptic();
                                        setSelectedCountry(item);
                                        setShowCountryModal(false);
                                        setPhoneNumber('');
                                    }}
                                >
                                    <Text style={[styles.countryItemText, { color: colors.text }]}>{item.flag} {item.name}</Text>
                                    <Text style={[styles.countryItemCode, { color: colors.subtext }]}>{item.code}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        marginBottom: 24,
        width: '100%',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    phoneInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 4,
        height: 64,
        borderWidth: 1,
    },
    countryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: '100%',
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '600',
    },
    dropdownIcon: {
        fontSize: 12,
        marginLeft: 4,
    },
    divider: {
        width: 1,
        height: '40%',
        marginHorizontal: 4,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
        paddingHorizontal: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        fontSize: 20,
    },
    countryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    countryItemText: {
        fontSize: 17,
    },
    countryItemCode: {
        fontSize: 17,
        fontWeight: '500',
    },
});
