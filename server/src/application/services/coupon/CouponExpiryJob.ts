import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ICouponRepository } from '../../ports/repositories/ICouponRepository';
import { CouponService } from './CouponService';

@Injectable()
export class CouponExpiryJob {
  private readonly logger = new Logger(CouponExpiryJob.name);

  constructor(
    @Inject('ICouponRepository') private readonly couponRepo: ICouponRepository,
    private readonly couponService: CouponService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredCoupons() {
    this.logger.debug(
      'Running Coupon Expiry Job to check for expired coupons...',
    );

    try {
      const expiredCoupons = await this.couponRepo.findExpiredUnrefunded();

      if (expiredCoupons.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${expiredCoupons.length} expired coupons needing refund.`,
      );

      for (const coupon of expiredCoupons) {
        try {
          await this.couponService.refundExpiredCoupon(coupon.id);
          this.logger.log(
            `Successfully refunded expired coupon ${coupon.id} (${coupon.code})`,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to refund expired coupon ${coupon.id}`,
            error.stack,
          );
        }
      }
    } catch (error: any) {
      this.logger.error('Error during Coupon Expiry Job', error.stack);
    }
  }
}
