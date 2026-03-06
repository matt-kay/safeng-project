import { Coupon } from '../../../domain/entities/Coupon';

export interface ICouponRepository {
  findById(id: string): Promise<Coupon | null>;
  findByCode(code: string): Promise<Coupon | null>;
  findByCreatorId(
    creatorUserId: string,
    limit?: number,
    offset?: number,
  ): Promise<Coupon[]>;
  save(coupon: Coupon): Promise<void>;
  // For background jobs
  findExpiredUnrefunded(): Promise<Coupon[]>;
}
