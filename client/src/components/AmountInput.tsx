import React, { useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

interface AmountInputProps {
    value: string;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    presets?: number[];
    label?: string;
    error?: string;
}

const formatCurrency = (val: string) => {
    if (!val) return '';
    const numericValue = val.replace(/\D/g, '');
    return new Intl.NumberFormat('en-NG').format(parseInt(numericValue, 10));
};

export default function AmountInput({
    value,
    onChange,
    min = 50,
    max = 500000,
    presets = [50, 100, 200, 500, 1000, 2000, 5000],
    label = "Amount",
    error,
}: AmountInputProps) {

    const handleTextChange = (text: string) => {
        const numericValue = text.replace(/\D/g, '');
        onChange(numericValue);
    };

    const handlePresetPress = (amount: number) => {
        onChange(amount.toString());
    };

    const formattedValue = formatCurrency(value);

    const numericValue = parseInt(value, 10) || 0;
    const isError = Boolean(error) || (value !== '' && (numericValue < min || numericValue > max));
    const errorMessage = error || (numericValue < min ? `Minimum amount is ₦${min}` : `Maximum amount is ₦${formatCurrency(max.toString())}`);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            <View style={[styles.inputContainer, isError && styles.inputError]}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                    style={styles.input}
                    value={formattedValue}
                    onChangeText={handleTextChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#999"
                />
            </View>

            {isError && (
                <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsContainer}
            >
                {presets.map((amount) => (
                    <TouchableOpacity
                        key={amount}
                        style={[
                            styles.presetButton,
                            numericValue === amount && styles.activePresetButton
                        ]}
                        onPress={() => handlePresetPress(amount)}
                    >
                        <Text style={[
                            styles.presetButtonText,
                            numericValue === amount && styles.activePresetButtonText
                        ]}>
                            ₦{formatCurrency(amount.toString())}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F7',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 64,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    inputError: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        padding: 0, // Remove default Android padding
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    presetsContainer: {
        paddingVertical: 16,
        gap: 8,
    },
    presetButton: {
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        minWidth: 70,
        alignItems: 'center',
    },
    activePresetButton: {
        backgroundColor: '#FF9500',
        borderColor: '#FF9500',
    },
    presetButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    activePresetButtonText: {
        color: '#FFFFFF',
    },
});
