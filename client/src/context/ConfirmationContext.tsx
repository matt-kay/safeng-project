import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    isDestructive?: boolean;
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => void;
    isVisible: boolean;
    options: ConfirmationOptions | null;
    hide: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);

    const hide = useCallback(() => {
        setIsVisible(false);
        if (options?.onCancel) options.onCancel();
    }, [options]);

    const confirm = useCallback((newOptions: ConfirmationOptions & { useNative?: boolean }) => {
        if (newOptions.useNative && Platform.OS !== 'web') {
            // Fallback to native Alert for iOS/Android if explicitly requested
            Alert.alert(
                newOptions.title,
                newOptions.message,
                [
                    {
                        text: newOptions.cancelText || 'Cancel',
                        style: 'cancel',
                        onPress: newOptions.onCancel
                    },
                    {
                        text: newOptions.confirmText || 'Confirm',
                        style: newOptions.isDestructive ? 'destructive' : 'default',
                        onPress: newOptions.onConfirm
                    }
                ]
            );
            return;
        }

        // Use the custom dialog state for all platforms (Web and Mobile) by default
        setOptions(newOptions);
        setIsVisible(true);
    }, []);


    return (
        <ConfirmationContext.Provider value={{ confirm, isVisible, options, hide }}>
            {children}
        </ConfirmationContext.Provider>
    );
}

export function useConfirmation() {
    const context = useContext(ConfirmationContext);
    if (context === undefined) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
}
