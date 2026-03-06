import apiClient from './api-client';

export interface VTPassStatusResponse {
    environment: string;
    balance: number;
}

export interface StripeStatusResponse {
    environment: string;
}

export class AdminIntegrationService {
    static async getVTPassStatus(): Promise<VTPassStatusResponse> {
        const { data } = await apiClient.get<VTPassStatusResponse>('/admin/integrations/vtpass');
        return data;
    }

    static async getStripeStatus(): Promise<StripeStatusResponse> {
        const { data } = await apiClient.get<StripeStatusResponse>('/admin/integrations/stripe');
        return data;
    }
}
