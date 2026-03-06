import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { save, getValueFor } from '../services/storage';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';

type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsContextType {
    theme: ThemePreference;
    resolvedTheme: 'light' | 'dark';
    colors: typeof Colors.light;
    setTheme: (theme: ThemePreference) => Promise<void>;
    hapticEnabled: boolean;
    setHapticEnabled: (enabled: boolean) => Promise<void>;
    triggerHaptic: (type?: Haptics.ImpactFeedbackStyle) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const THEME_KEY = 'settings_theme_preference';
const HAPTIC_KEY = 'settings_haptic_enabled';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const deviceColorScheme = useDeviceColorScheme();
    const [theme, setThemeState] = useState<ThemePreference>('system');
    const [hapticEnabled, setHapticState] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedTheme = await getValueFor(THEME_KEY);
            if (savedTheme) {
                setThemeState(savedTheme as ThemePreference);
            } else {
                // Explicitly set to system if no saved preference
                setThemeState('system');
            }

            const savedHaptic = await getValueFor(HAPTIC_KEY);
            if (savedHaptic !== null) {
                setHapticState(savedHaptic === 'true');
            }
        } catch (error) {
            console.error('[SettingsContext] Error loading settings:', error);
        }
    };

    const setTheme = async (newTheme: ThemePreference) => {
        setThemeState(newTheme);
        try {
            await save(THEME_KEY, newTheme);
        } catch (error) {
            console.error('[SettingsContext] Error saving theme:', error);
        }
    };

    const setHapticEnabled = async (enabled: boolean) => {
        setHapticState(enabled);
        try {
            await save(HAPTIC_KEY, enabled.toString());
        } catch (error) {
            console.error('[SettingsContext] Error saving haptic setting:', error);
        }
    };

    const triggerHaptic = (type: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
        if (hapticEnabled) {
            Haptics.impactAsync(type);
        }
    };

    const resolvedTheme = theme === 'system'
        ? (deviceColorScheme === 'dark' ? 'dark' : 'light')
        : theme;

    const currentColors = Colors[resolvedTheme as 'light' | 'dark'];

    return (
        <SettingsContext.Provider
            value={{
                theme,
                resolvedTheme: resolvedTheme as 'light' | 'dark',
                colors: currentColors,
                setTheme,
                hapticEnabled,
                setHapticEnabled,
                triggerHaptic
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
