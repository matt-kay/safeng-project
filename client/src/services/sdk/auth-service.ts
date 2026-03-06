import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import Constants from 'expo-constants';

const emulatorHost = Constants.expoConfig?.extra?.firebaseAuthEmulatorHost;

if (__DEV__ && emulatorHost) {
    // If running on Android emulator, localhost must be 10.0.2.2
    // But we let the user define it in .env
    console.log(`Connecting to Firebase Auth Emulator at ${emulatorHost}`);
    auth().useEmulator(`http://${emulatorHost}`);
}

export class AuthService {
    static onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
        return auth().onAuthStateChanged(callback);
    }

    static async signOut() {
        try {
            await auth().signOut();
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    static async getCurrentToken(): Promise<string | null> {
        try {
            const user = auth().currentUser;
            if (user) {
                return await user.getIdToken();
            }
            return null;
        } catch (error) {
            console.error('Get token error:', error);
            return null;
        }
    }

    static get currentUser() {
        return auth().currentUser;
    }
}
