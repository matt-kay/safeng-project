import apiClient from './api-client';
import { TrendPeriod, TrendDataPoint } from './admin-user-service';

export interface AdminTransactionStats {
    total: number;
    wallet: number;
    coupon: number;
    success: number;
    pending: number;
    failed: number;
    trend: TrendDataPoint[];
}

export interface AdminTransactionListItem {
    id: string;
    walletId: string;
    userId: string;
    type: string;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    status: string;
    createdAt: string;
    userEmail?: string;
    userName?: string;
}

export interface GetAdminTransactionsResponse {
    transactions: AdminTransactionListItem[];
    total: number;
    hasMore: boolean;
}

export class AdminTransactionService {
    static async getTransactionStats(period: TrendPeriod = 'month'): Promise<AdminTransactionStats> {
        const { data } = await apiClient.get<AdminTransactionStats>('/admin/transactions/stats', {
            params: { period },
        });
        return data;
    }

    static async getTransactions(params: {
        page?: number;
        limit?: number;
        filterType?: 'status' | 'type' | 'category';
        filterValue?: string;
        search?: string;
    }): Promise<GetAdminTransactionsResponse> {
        const { data } = await apiClient.get<GetAdminTransactionsResponse>('/admin/transactions', {
            params,
        });

        return {
            ...data,
            transactions: data.transactions.map(t => ({
                ...t,
                amount: (t.amount ?? 0) / 100,
            }))
        };
    }

    static async getTransaction(id: string): Promise<AdminTransactionListItem & { metadata?: any }> {
        const { data } = await apiClient.get<AdminTransactionListItem & { metadata?: any }>(`/admin/transactions/${id}`);
        return {
            ...data,
            amount: (data.amount ?? 0) / 100,
        };
    }
}
