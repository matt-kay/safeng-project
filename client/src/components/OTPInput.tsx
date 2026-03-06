import React, { useRef } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

interface OTPInputProps {
    code: string[];
    setCode: (code: string[]) => void;
    autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
    code,
    setCode,
    autoFocus = true
}) => {
    const inputs = useRef<TextInput[]>([]);
    const { colors } = useSettings();

    const handleChange = (text: string, index: number) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        // Auto-focus next input
        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    return (
        <View style={styles.otpContainer}>
            {code.map((digit, index) => (
                <TextInput
                    key={index}
                    ref={(ref) => { inputs.current[index] = ref!; }}
                    style={[
                        styles.otpInput,
                        { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                        digit !== '' && { borderColor: colors.primary, backgroundColor: colors.background }
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    autoFocus={autoFocus && index === 0}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        width: '100%',
    },
    otpInput: {
        width: '14%',
        height: 60,
        borderRadius: 12,
        borderWidth: 1,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
    },
});
