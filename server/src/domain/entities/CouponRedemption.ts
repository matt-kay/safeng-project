export enum RedemptionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export class CouponRedemption {
  constructor(
    public readonly id: string,
    public readonly couponId: string,
    public readonly redeemerUserId: string,
    public readonly amount: number, // in smallest unit
    public readonly status: RedemptionStatus,
    public readonly idempotencyKey: string,
    public readonly redeemLedgerId: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
