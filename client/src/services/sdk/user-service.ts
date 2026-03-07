import apiClient from './api-client';

export interface EmergencyContact {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    relationship?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    isProfileComplete: boolean;
    role?: 'customer' | 'admin';
    status?: string;
    sos_subscription_active?: boolean;
}

export class UserService {
    static async getProfile(): Promise<UserProfile> {
        const { data } = await apiClient.get<any>('/me/profile');
        return {
            id: data.uid,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            phoneNumber: data.phone_number,
            isProfileComplete: !data.profile_missing,
            role: data.role,
            status: data.status,
            sos_subscription_active: data.sos_subscription_active
        };
    }

    static async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        const payload = {
            first_name: profileData.firstName,
            last_name: profileData.lastName,
            email: profileData.email,
        };
        const { data } = await apiClient.post<any>('/me/profile', payload);
        return {
            id: data.uid,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            phoneNumber: data.phone_number,
            isProfileComplete: true,
            role: data.role,
            status: data.status,
            sos_subscription_active: data.sos_subscription_active
        };
    }

    static async updateProfile(profileUpdates: Partial<UserProfile>): Promise<UserProfile> {
        const payload: any = {};
        if (profileUpdates.firstName) payload.first_name = profileUpdates.firstName;
        if (profileUpdates.lastName) payload.last_name = profileUpdates.lastName;
        if (profileUpdates.email) payload.email = profileUpdates.email;
        if (profileUpdates.phoneNumber) payload.phone_number = profileUpdates.phoneNumber;

        const { data } = await apiClient.patch<any>('/me/profile', payload);
        return {
            id: data.uid,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            phoneNumber: data.phone_number,
            isProfileComplete: true,
            role: data.role,
            status: data.status,
            sos_subscription_active: data.sos_subscription_active
        };
    }

    static async deleteAccount(): Promise<void> {
        await apiClient.delete('/me');
    }

    static async initializeSOSSubscription(platform: string = 'web'): Promise<{ authorization_url: string; reference: string }> {
        const { data } = await apiClient.post<any>('/payments/paystack/initialize-sos', { platform });
        return data;
    }

    static async updateSOSContacts(contacts: EmergencyContact[]): Promise<void> {
        await apiClient.post('/sos/contacts', contacts);
    }

    static async getSOSStatus(): Promise<{ subscribed: boolean; contacts: EmergencyContact[] }> {
        const { data } = await apiClient.get<any>('/sos/status');
        return data;
    }

    static async getSOSSubscriptionDetails(): Promise<{
        status: string;
        cardUsed: string | null;
        subscribedOn: string | null;
        nextChargeDate: string | null;
    }> {
        const { data } = await apiClient.get<any>('/sos/subscription');
        return data;
    }

    static async cancelSOSSubscription(): Promise<void> {
        await apiClient.post('/sos/subscription/cancel');
    }
}
