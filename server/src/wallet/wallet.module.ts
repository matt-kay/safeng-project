import { Module } from '@nestjs/common';
import { WalletController } from '../interface/controllers/wallet/WalletController';
import { StripeWebhookController } from '../interface/controllers/webhooks/StripeWebhookController';
import { WalletService } from '../application/services/wallet/WalletService';
import { StripeService } from '../infrastructure/services/StripeService';
import { FirebaseWalletRepository } from '../infrastructure/repositories/FirebaseWalletRepository';
import { FirebasePaymentCardRepository } from '../infrastructure/repositories/FirebasePaymentCardRepository';
import { FirebaseTransactionRepository } from '../infrastructure/repositories/FirebaseTransactionRepository';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PortalSettingsService } from '../application/services/PortalSettingsService';
import { ApplicationModule } from '../application/application.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [InfrastructureModule, ApplicationModule, NotificationModule],
  controllers: [WalletController, StripeWebhookController],
  providers: [
    WalletService,
    {
      provide: 'IStripeService',
      useClass: StripeService,
    },
    {
      provide: 'IWalletRepository',
      useClass: FirebaseWalletRepository,
    },
    {
      provide: 'IPaymentCardRepository',
      useClass: FirebasePaymentCardRepository,
    },
    {
      provide: 'ITransactionRepository',
      useClass: FirebaseTransactionRepository,
    },
  ],
  exports: [WalletService],
})
export class WalletModule { }
