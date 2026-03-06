import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Platform } from 'react-native';

// Standard Firebase SDK for Web
let webAuth: any;
if (Platform.OS === 'web') {
    const { getAuth } = require('firebase/auth');
    const { initializeApp, getApps } = require('firebase/app');

    // Initialize Web Firebase if not already initialized
    // These values should ideally come from process.env
    const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

    if (getApps().length === 0) {
        initializeApp(firebaseConfig);
    }
    webAuth = getAuth();

    // Connect to Auth Emulator if in development
    if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
        const { connectAuthEmulator } = require('firebase/auth');
        const [host, port] = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST.split(':');
        connectAuthEmulator(webAuth, `http://${host}:${port}`);
        console.log(`[AuthService] Web connected to Auth Emulator at ${host}:${port}`);
    }
}

// Native Emulator Setup
if (Platform.OS !== 'web' && __DEV__ && process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
    const hostAndPort = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    auth().useEmulator(`http://${hostAndPort}`);
    console.log(`[AuthService] Native connected to Auth Emulator at ${hostAndPort}`);
}

class AuthService {
    private recaptchaVerifier: any;

    /**
     * Send OTP to a phone number
     */
    async signInWithPhoneNumber(phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult | any> {
        if (Platform.OS === 'web') {
            const { signInWithPhoneNumber, RecaptchaVerifier } = require('firebase/auth');

            // On web we need a RecaptchaVerifier. 
            // Reuse if exists, otherwise create.
            if (!this.recaptchaVerifier) {
                this.recaptchaVerifier = new RecaptchaVerifier(webAuth, 'recaptcha-container', {
                    size: 'invisible',
                    callback: (response: any) => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    },
                    'expired-callback': () => {
                        // Response expired. Ask user to solve reCAPTCHA again.
                        this.recaptchaVerifier = null;
                    }
                });
            }

            try {
                return await signInWithPhoneNumber(webAuth, phoneNumber, this.recaptchaVerifier);
            } catch (error) {
                // If it fails, try resetting the verifier
                this.recaptchaVerifier = null;
                throw error;
            }
        } else {
            return await auth().signInWithPhoneNumber(phoneNumber);
        }
    }

    /**
     * Listen to auth state changes
     */
    onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
        if (Platform.OS === 'web') {
            const { onAuthStateChanged } = require('firebase/auth');
            return onAuthStateChanged(webAuth, callback);
        } else {
            return auth().onAuthStateChanged(callback);
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        if (Platform.OS === 'web') {
            const { signOut } = require('firebase/auth');
            await signOut(webAuth);
        } else {
            await auth().signOut();
        }
    }

    /**
     * Confirm the OTP code
     */
    async confirmCode(confirmation: any, code: string) {
        if (Platform.OS === 'web') {
            const { PhoneAuthProvider, signInWithCredential } = require('firebase/auth');

            // On web, confirmation might be a string (verificationId) due to navigation serialization
            if (typeof confirmation === 'string') {
                const credential = PhoneAuthProvider.credential(confirmation, code);
                return await signInWithCredential(webAuth, credential);
            }

            // If it's the original ConfirmationResult object
            return await confirmation.confirm(code);
        } else {
            // Check if confirmation is a verificationId (string) or a confirmation object
            if (typeof confirmation === 'string') {
                // On native, if we only have verificationId, we create a credential
                const credential = (auth as any).PhoneAuthProvider.credential(confirmation, code);
                return await auth().signInWithCredential(credential);
            }
            return await confirmation.confirm(code);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        if (Platform.OS === 'web') {
            return webAuth.currentUser;
        } else {
            return auth().currentUser;
        }
    }

    /**
     * Get Firebase ID token for current user
     */
    /**
     * Get Firebase ID token for current user
     */
    async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
        const user = this.getCurrentUser();
        if (user) {
            return await user.getIdToken(forceRefresh);
        }
        return null;
    }

    /**
     * Get Phone Auth Credential
     */
    getPhoneCredential(verificationId: string, code: string) {
        if (Platform.OS === 'web') {
            const { PhoneAuthProvider } = require('firebase/auth');
            return PhoneAuthProvider.credential(verificationId, code);
        } else {
            return (auth as any).PhoneAuthProvider.credential(verificationId, code);
        }
    }

    /**
     * Update current user's phone number
     */
    async updateUserPhoneNumber(credential: any) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('No user logged in');

        if (Platform.OS === 'web') {
            const { updatePhoneNumber } = require('firebase/auth');
            await updatePhoneNumber(user, credential);
        } else {
            await user.updatePhoneNumber(credential);
        }
    }
}

export const authService = new AuthService();
