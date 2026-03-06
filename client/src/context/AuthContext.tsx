import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { authService } from '../services/AuthService';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { UserService, UserProfile } from '../services/sdk/user-service';

interface AuthContextType {
    user: FirebaseAuthTypes.User | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (phoneNumber: string) => Promise<any>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    verifyNewPhoneNumber: (phoneNumber: string) => Promise<any>;
    confirmNewPhoneNumber: (confirmation: any, code: string) => Promise<void>;
    isMaintenanceLocked: boolean;
    clearMaintenanceLock: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMaintenanceLocked, setIsMaintenanceLocked] = useState(false);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            setUser(user);
            if (user) {
                await refreshProfile();
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const fetchProfile = async () => {
        try {
            const userProfile = await UserService.getProfile();
            setProfile(userProfile);
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.log('[AuthContext] Profile not found, this is expected for new users.');
            } else if (error.response?.status === 503) {
                console.warn('[AuthContext] Service unavailable (maintenance mode). Logging out...');
                setIsMaintenanceLocked(true);
                await signOut();
                return; // Stop further execution
            } else {
                console.error('[AuthContext] Error fetching profile:', error.message);
            }

            // Fallback to minimal profile for new users or on error
            if (user) {
                setProfile({
                    id: user.uid,
                    phoneNumber: user.phoneNumber || undefined,
                    email: user.email || '',
                    isProfileComplete: false,
                });
            }
        }
    };

    const signIn = async (phoneNumber: string) => {
        return await authService.signInWithPhoneNumber(phoneNumber);
    };

    const signOut = async () => {
        await authService.signOut();
    };

    const refreshProfile = async () => {
        await fetchProfile();
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        try {
            let updatedProfile: UserProfile;

            // If the profile is not complete, it likely doesn't exist on the server yet
            // (based on fetchProfile's fallback behavior)
            if (profile && !profile.isProfileComplete) {
                console.log('[AuthContext] Creating new profile...');
                updatedProfile = await UserService.createProfile(updates);
            } else {
                console.log('[AuthContext] Updating existing profile...');
                updatedProfile = await UserService.updateProfile(updates);
            }

            setProfile(updatedProfile);
        } catch (error) {
            console.error('Error in updateProfile:', error);
            throw error;
        }
    };

    const verifyNewPhoneNumber = async (phoneNumber: string) => {
        return await authService.signInWithPhoneNumber(phoneNumber);
    };

    const confirmNewPhoneNumber = async (confirmation: any, code: string) => {
        try {
            const verificationId = typeof confirmation === 'string' ? confirmation : confirmation.verificationId;
            const credential = authService.getPhoneCredential(verificationId, code);
            await authService.updateUserPhoneNumber(credential);

            // Sync with backend
            const updatedProfile = await UserService.updateProfile({
                phoneNumber: authService.getCurrentUser()?.phoneNumber || undefined
            });
            setProfile(updatedProfile);
        } catch (error) {
            console.error('Error confirming new phone number:', error);
            throw error;
        }
    };

    const clearMaintenanceLock = () => {
        setIsMaintenanceLocked(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signIn,
            signOut,
            refreshProfile,
            updateProfile,
            verifyNewPhoneNumber,
            confirmNewPhoneNumber,
            isMaintenanceLocked,
            clearMaintenanceLock,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
