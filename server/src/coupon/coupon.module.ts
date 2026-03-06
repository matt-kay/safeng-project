import { Module } from '@nestjs/common';
import { CouponController } from '../presentation/controllers/coupon.controller';
import { CouponService } from '../application/services/coupon/CouponService';
import { CouponExpiryJob } from '../application/services/coupon/CouponExpiryJob';
import { FirebaseCouponRepository } from '../infrastructure/repositories/FirebaseCouponRepository';
import { FirebaseCouponRedemptionRepository } from '../infrastructure/repositories/FirebaseCouponRedemptionRepository';
import { FirebaseWalletRepository } from '../infrastructure/repositories/FirebaseWalletRepository';
import { FirebaseTransactionRepository } from '../infrastructure/repositories/FirebaseTransactionRepository';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [CouponController],
  providers: [
    CouponService,
    CouponExpiryJob,
    {
      provide: 'ICouponRepository',
      useClass: FirebaseCouponRepository,
    },
    {
      provide: 'ICouponRedemptionRepository',
      useClass: FirebaseCouponRedemptionRepository,
    },
    {
      provide: 'IWalletRepository',
      useClass: FirebaseWalletRepository,
    },
    {
      provide: 'ITransactionRepository',
      useClass: FirebaseTransactionRepository,
    },
  ],
  exports: [CouponService],
})
export class CouponModule {}
