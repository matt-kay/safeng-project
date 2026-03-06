import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionController } from '../presentation/controllers/transaction.controller';
import { VtpassWebhookController } from '../presentation/controllers/vtpass-webhook.controller';
import { TransactionExecutionService } from '../application/services/transaction-execution.service';
import { RequeryEngineService } from '../application/services/requery.engine';
import { FirebaseTransactionRepository } from '../infrastructure/repositories/FirebaseTransactionRepository';
import { FirebaseWalletRepository } from '../infrastructure/repositories/FirebaseWalletRepository';
import { VtpassModule } from '../infrastructure/services/vtpass/vtpass.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ScheduleModule.forRoot(), VtpassModule, NotificationModule],
  controllers: [TransactionController, VtpassWebhookController],
  providers: [
    TransactionExecutionService,
    RequeryEngineService,
    {
      provide: 'ITransactionRepository',
      useClass: FirebaseTransactionRepository,
    },
    {
      provide: 'IWalletRepository',
      useClass: FirebaseWalletRepository,
    },
  ],
  exports: [TransactionExecutionService],
})
export class TransactionModule { }
