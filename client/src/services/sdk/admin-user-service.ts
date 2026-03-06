import apiClient from './api-client';

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
}
