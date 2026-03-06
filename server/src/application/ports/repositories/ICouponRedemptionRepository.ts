import { CouponRedemption } from '../../../domain/entities/CouponRedemption';

export interface ICouponRedemptionRepository {
  findById(id: string): Promise<CouponRedemption | null>;
  findByCouponId(couponId: string): Promise<CouponRedemption[]>;
  findByUserAndCoupon(
    userId: string,
    couponId: string,
  ): Promise<CouponRedemption | null>;
  save(redemption: CouponRedemption): Promise<void>;
}
