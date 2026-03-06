export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export class Coupon {
  constructor(
    public readonly id: string,
    public readonly creatorUserId: string,
    public readonly code: string,
    public name: string,
    public readonly currency: string,
    public readonly amountPerUse: number, // in smallest unit (e.g. Kobo)
    public readonly maxUses: number,
    public remainingUses: number,
    public status: CouponStatus,
    public expiresAt: Date,
    public readonly fundingLedgerId: string,
    public expiredRefundLedgerId: string | null = null,
    public revokedRefundLedgerId: string | null = null,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public pause(): void {
    if (this.status === CouponStatus.ACTIVE) {
      this.status = CouponStatus.PAUSED;
      this.updatedAt = new Date();
    }
  }

  public resume(): void {
    if (this.status === CouponStatus.PAUSED && !this.isExpired()) {
      this.status = CouponStatus.ACTIVE;
      this.updatedAt = new Date();
    }
  }

  public revoke(refundLedgerId: string): void {
    this.status = CouponStatus.REVOKED;
    this.revokedRefundLedgerId = refundLedgerId;
    this.remainingUses = 0;
    this.updatedAt = new Date();
  }

  public expire(refundLedgerId: string): void {
    this.status = CouponStatus.EXPIRED;
    this.expiredRefundLedgerId = refundLedgerId;
    this.remainingUses = 0;
    this.updatedAt = new Date();
  }

  public isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  public canBeRedeemed(): boolean {
    return (
      this.status === CouponStatus.ACTIVE &&
      !this.isExpired() &&
      this.remainingUses > 0
    );
  }

  public decrementUses(): void {
    if (this.remainingUses > 0) {
      this.remainingUses -= 1;
      this.updatedAt = new Date();
    }
  }
}
