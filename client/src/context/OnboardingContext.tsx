import React, { createContext, useContext, useState, useEffect } from 'react';
import { getValueFor, save } from '@/services/storage';

interface OnboardingContextType {
    hasSeenOnboarding: boolean | null;
    completeOnboarding: () => Promise<void>;
    isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkStatus() {
            try {
                const val = await getValueFor('hasSeenOnboarding');
                setHasSeenOnboarding(val === 'true');
            } catch (e) {
                setHasSeenOnboarding(false);
            } finally {
                setIsLoading(false);
            }
        }
        checkStatus();
    }, []);

    const completeOnboarding = async () => {
        try {
            await save('hasSeenOnboarding', 'true');
            setHasSeenOnboarding(true);
        } catch (e) {
            console.warn('Failed to save onboarding state', e);
        }
    };

    return (
        <OnboardingContext.Provider value={{ hasSeenOnboarding, completeOnboarding, isLoading }}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}
