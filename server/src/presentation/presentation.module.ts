import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { WalletModule } from '../wallet/wallet.module';
import { UserController } from './controllers/user.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AuthController } from './controllers/auth.controller';
import { AuditController } from './controllers/audit.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminTransactionController } from './controllers/admin-transaction.controller';
import { PublicSettingsController } from './controllers/public-settings.controller';
import { AdminIntegrationController } from './controllers/admin-integration.controller';

import { BeneficiaryModule } from '../beneficiary/beneficiary.module';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [
    ApplicationModule,
    InfrastructureModule,
    WalletModule,
    BeneficiaryModule,
    CouponModule,
  ],
  controllers: [
    UserController,
    AdminUserController,
    AuthController,
    AuditController,
    AdminSettingsController,
    AdminTransactionController,
    PublicSettingsController,
    AdminIntegrationController,
  ],
})
export class PresentationModule { }
