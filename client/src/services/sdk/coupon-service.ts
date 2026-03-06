import apiClient from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CouponStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'EXPIRED';

export interface Coupon {
    id: string;
    creatorUserId: string;
    code: string;
    name: string;
    currency: string;
    amountPerUse: number;      // In Kobo
    maxUses: number;
    remainingUses: number;
    status: CouponStatus;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface CouponRedemption {
    id: string;
    couponId: string;
    redeemerUserId: string;
    amount: number;            // In Kobo
    status: 'SUCCESS' | 'FAILED' | 'REVERSED';
    createdAt: string;
}

export interface CouponDetail extends Coupon {
    redemptions?: CouponRedemption[];
}

export interface CreateCouponDto {
    name?: string;
    code?: string;
    amount_per_use: number;    // In Kobo
    max_uses: number;
    currency?: string;
    expires_at: string;        // ISO 8601
    idempotency_key: string;
}

export interface RedeemCouponDto {
    code: string;
    idempotency_key: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

type ApiResponse<T> = { status: string; data: T };

export class CouponService {
    /** List all coupons created by the current user */
    static async getCoupons(page = 1, limit = 20): Promise<Coupon[]> {
        const { data } = await apiClient.get<ApiResponse<Coupon[]>>('/coupons', {
            params: { page, limit }
        });
        return data.data;
    }

    /** Get detailed status + redemption history for one coupon */
    static async getCoupon(id: string): Promise<CouponDetail> {
        const { data } = await apiClient.get<ApiResponse<CouponDetail>>(`/coupons/${id}`);
        return data.data;
    }

    /** Create and fund a new coupon (debits wallet) */
    static async createCoupon(dto: CreateCouponDto): Promise<Coupon> {
        const { data } = await apiClient.post<ApiResponse<Coupon>>('/coupons', dto);
        return data.data;
    }

    /** Redeem a coupon by code (credits wallet) */
    static async redeemCoupon(dto: RedeemCouponDto): Promise<{ message: string }> {
        const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/coupons/redeem', dto);
        return data.data;
    }

    /** Pause an active coupon */
    static async pauseCoupon(id: string): Promise<Coupon> {
        const { data } = await apiClient.post<ApiResponse<Coupon>>(`/coupons/${id}/pause`, {});
        return data.data;
    }

    /** Resume a paused coupon */
    static async resumeCoupon(id: string): Promise<Coupon> {
        const { data } = await apiClient.post<ApiResponse<Coupon>>(`/coupons/${id}/resume`, {});
        return data.data;
    }

    /** Revoke a coupon and trigger immediate refund of unused funds */
    static async revokeCoupon(id: string): Promise<Coupon> {
        const { data } = await apiClient.post<ApiResponse<Coupon>>(`/coupons/${id}/revoke`, {});
        return data.data;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Convert Kobo amount to a formatted Naira string */
    static formatNaira(kobo: number): string {
        return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    /** Total funded amount in Kobo */
    static totalFunded(coupon: Coupon): number {
        return coupon.amountPerUse * coupon.maxUses;
    }

    /** Total redeemed amount in Kobo */
    static totalRedeemed(coupon: Coupon): number {
        return coupon.amountPerUse * (coupon.maxUses - coupon.remainingUses);
    }
}
