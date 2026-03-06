import apiClient from './api-client';

export interface VTPassVariation {
    variation_code: string;
    name: string;
    variation_amount: string;
    fixedPrice: string;
}

export interface VerifyMerchantResponse {
    Customer_Name?: string;
    Status?: string;
    [key: string]: any;
}

export interface VTUTransactionRequest {
    serviceID: string;
    billersCode: string;
    variation_code?: string;
    amount: number; // in Kobo (Naira * 100)
    phone: string;
    subscription_type?: string;
}

export interface VTUTransactionResponse {
    status: string;
    message: string;
    data: any;
}

export class VTUService {
    /**
     * Get variations (plans) for a specific service ID (e.g., 'mtn-data', 'dstv')
     */
    static async getVariations(serviceId: string, forceRefresh: boolean = false): Promise<VTPassVariation[]> {
        const { data } = await apiClient.get<{ status: string; data: VTPassVariation[] }>(
            `/vtpass/variations/${serviceId}`,
            { params: { forceRefresh } }
        );
        return data.data;
    }

    /**
     * Verify merchant details (e.g., Meter Number for electricity, Smartcard for TV)
     */
    static async verifyMerchant(billerCode: string, providerServiceId: string, serviceType: string): Promise<VerifyMerchantResponse> {
        const { data } = await apiClient.post<{ status: string; data: VerifyMerchantResponse }>(
            '/vtpass/verify',
            { billerCode, providerServiceId, serviceType }
        );
        return data.data;
    }

    /**
     * Initiate a VTU transaction (Airtime, Data, Bills)
     * Amount should be in Kobo (Naira * 100)
     */
    static async initiateTransaction(request: VTUTransactionRequest): Promise<VTUTransactionResponse> {
        const { data } = await apiClient.post<VTUTransactionResponse>('/transactions/initiate', request);
        return data;
    }
}
