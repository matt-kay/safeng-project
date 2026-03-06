export default ({ config }) => {
    return {
        ...config,
        extra: {
            ...config.extra,
            apiUrl: process.env.API_URL || 'http://localhost:3000/api/v1',
            firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
            firebaseConfig: {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID,
            },
        },
    };
};
