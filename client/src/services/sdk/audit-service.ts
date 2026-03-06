import apiClient from './api-client';

export interface AuditLog {
    id: string;
    action: string;
    actor_uid: string;
    target_uid: string;
    reason: string | null;
    before: any;
    after: any;
    created_at: string;
    metadata?: Record<string, any>;
}

export interface AuditListResponse {
    status: string;
    data: AuditLog[];
    meta: {
        limit: number;
        nextCursor?: string;
    };
}

export class AuditService {
    static async getActivities(limit: number = 20, cursor?: string): Promise<{ logs: AuditLog[]; nextCursor?: string }> {
        const url = `/audit/activities?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
        const { data } = await apiClient.get<AuditListResponse>(url);
        return {
            logs: data.data,
            nextCursor: data.meta.nextCursor,
        };
    }
}
