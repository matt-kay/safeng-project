import apiClient from './api-client';
import { WalletBalance, PaymentCard } from './wallet-service';
import { Beneficiary } from './beneficiary-service';

export interface Coupon {
    id: string;
    creatorUserId: string;
    code: string;
    name: string;
    currency: string;
    amountPerUse: number;
    maxUses: number;
    remainingUses: number;
    status: string;
    expiresAt: string;
    createdAt: string;
}

export type TrendPeriod = 'day' | 'week' | 'month' | 'year';

export interface TrendDataPoint {
    label: string;
    count: number;
}

export interface AdminUserStats {
    total: number;
    customer: number;
    admin: number;
    active: number;
    inactive: number;
    suspended: number;
    trend: TrendDataPoint[];
}

export interface UserListItem {
    uid: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role: string;
    status: string;
    created_at: string;
}

export interface GetUsersResponse {
    users: UserListItem[];
    total: number;
    hasMore: boolean;
}

export class AdminUserService {
    static async getUserStats(period: TrendPeriod = 'month'): Promise<AdminUserStats> {
        const { data } = await apiClient.get<AdminUserStats>('/admin/users/stats', {
            params: { period },
        });
        return data;
    }

    static async listUsers(params: {
        page?: number;
        limit?: number;
        filterType?: 'role' | 'status';
        filterValue?: string;
        search?: string;
    }): Promise<GetUsersResponse> {
        const { data } = await apiClient.get<GetUsersResponse>('/admin/users', {
            params,
        });
        return data;
    }

    static async getUser(uid: string): Promise<UserListItem> {
        const { data } = await apiClient.get<UserListItem>(`/admin/users/${uid}`);
        return data;
    }

    static async getUserWallet(uid: string): Promise<WalletBalance> {
        const { data } = await apiClient.get<any>(`/admin/users/${uid}/wallet`);
        return {
            balance: (data.mainBalance ?? 0) / 100,
            cashbackBalance: (data.cashbackBalance ?? 0) / 100,
            currency: data.currency ?? 'NGN',
        };
    }

    static async getUserCards(uid: string): Promise<PaymentCard[]> {
        const { data } = await apiClient.get<any[]>(`/admin/users/${uid}/cards`);
        return data.map(c => ({
            id: c.id,
            last4: c.last4,
            brand: (c.brand ?? '').toLowerCase(),
            expiryMonth: c.expiryMonth,
            expiryYear: c.expiryYear,
            isDefault: c.isDefault ?? false,
        }));
    }

    static async getUserBeneficiaries(uid: string): Promise<Beneficiary[]> {
        const { data } = await apiClient.get<{ data: Beneficiary[] }>(`/admin/users/${uid}/beneficiaries`);
        return data.data;
    }

    static async getUserCoupons(uid: string, page: number = 1): Promise<{ coupons: Coupon[], total: number }> {
        const { data } = await apiClient.get<any>(`/admin/users/${uid}/coupons`, {
            params: { page, limit: 20 }
        });
        return {
            coupons: data.data,
            total: data.meta.total || 0, // Backend meta might not have total yet, but let's assume it does or adapt
        };
    }

    static async getUserActivities(uid: string, limit: number = 20, cursor?: string): Promise<{ logs: any[], nextCursor?: string }> {
        const { data } = await apiClient.get<any>(`/admin/users/${uid}/activities`, {
            params: { limit, cursor }
        });
        return {
            logs: data.data,
            nextCursor: data.meta.nextCursor,
        };
    }
}
