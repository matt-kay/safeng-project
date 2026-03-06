import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function save(key: string, value: string) {
    if (isWeb) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Local storage is unavailable:', e);
        }
    } else {
        // Lazy load to avoid issues on web
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
    }
}

export async function getValueFor(key: string) {
    if (isWeb) {
        return localStorage.getItem(key);
    } else {
        const SecureStore = require('expo-secure-store');
        return await SecureStore.getItemAsync(key);
    }
}

export async function deleteValueFor(key: string) {
    if (isWeb) {
        localStorage.removeItem(key);
    } else {
        const SecureStore = require('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
    }
}
