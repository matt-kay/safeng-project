import apiClient from './api-client';

export interface Beneficiary {
    id: string;
    userId: string;
    serviceType: string;
    providerServiceId: string;
    billerCode: string;
    billerName: string;
    nickname: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBeneficiaryDto {
    serviceType: string;
    providerServiceId: string;
    billerCode: string;
    billerName: string;
    nickname: string;
    isFavorite?: boolean;
}

export interface UpdateBeneficiaryDto {
    nickname?: string;
    isFavorite?: boolean;
}

export class BeneficiaryService {
    /**
     * Get all beneficiaries for the current user
     */
    static async getBeneficiaries(): Promise<Beneficiary[]> {
        const { data } = await apiClient.get<{ status: string; data: Beneficiary[] }>('/beneficiaries');
        return data.data;
    }

    /**
     * Create a new beneficiary
     */
    static async createBeneficiary(dto: CreateBeneficiaryDto): Promise<Beneficiary> {
        const { data } = await apiClient.post<{ status: string; data: Beneficiary }>('/beneficiaries', dto);
        return data.data;
    }

    /**
     * Update an existing beneficiary
     */
    static async updateBeneficiary(id: string, dto: UpdateBeneficiaryDto): Promise<Beneficiary> {
        const { data } = await apiClient.patch<{ status: string; data: Beneficiary }>(`/beneficiaries/${id}`, dto);
        return data.data;
    }

    /**
     * Delete/Archive a beneficiary
     */
    static async deleteBeneficiary(id: string): Promise<void> {
        await apiClient.delete(`/beneficiaries/${id}`);
    }
}
