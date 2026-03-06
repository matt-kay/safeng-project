import apiClient from './api-client';

export interface UserProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    isProfileComplete: boolean;
    role?: 'customer' | 'admin';
    status?: string;
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
            status: data.status
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
            status: data.status
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
            status: data.status
        };
    }

    static async deleteAccount(): Promise<void> {
        await apiClient.delete('/me');
    }
}
