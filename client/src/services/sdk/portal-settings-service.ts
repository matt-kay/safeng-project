import apiClient from './api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface PortalSettings {
    exchangeRate: number;
    topUpFeePercentage: number;
    maintenanceMode: boolean;
}



export class PortalSettingsService {
    constructor(private readonly client: typeof apiClient) { }



    async getSettings(): Promise<PortalSettings> {
        const response = await this.client.get<PortalSettings>('/admin/settings');
        return response.data;
    }

    async updateSettings(settings: Partial<PortalSettings>): Promise<PortalSettings> {
        const response = await this.client.patch<PortalSettings>('/admin/settings', settings);
        return response.data;
    }
}
