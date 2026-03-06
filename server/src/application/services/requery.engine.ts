import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ITransactionRepository } from '../../application/ports/repositories/ITransactionRepository';
import type { IWalletRepository } from '../../application/ports/repositories/IWalletRepository';
import { VTPassFacadeService } from './vtpass-facade.service';
import { TransactionExecutionService } from './transaction-execution.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/entities/Transaction';
import { VTPASS_STATUS_CODES } from '../../infrastructure/services/vtpass/vtpass.errors';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequeryEngineService {
  private readonly logger = new Logger(RequeryEngineService.name);

  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepo: ITransactionRepository,
    @Inject('IWalletRepository') private readonly walletRepo: IWalletRepository,
    private readonly vtpassFacade: VTPassFacadeService,
    private readonly transactionExecution: TransactionExecutionService,
  ) { }

  @Cron('0 */20 * * * *') // Run every 20 minutes
  async handlePendingTransactions() {
    this.logger.debug(
      'Running Requery Engine to check PENDING transactions...',
    );
    const pendingTransactions = await this.transactionRepo.findPending();

    if (pendingTransactions.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${pendingTransactions.length} pending transactions. Requerying...`,
    );

    for (const transaction of pendingTransactions) {
      await this.requerySingleTransaction(transaction);
    }
  }

  private async requerySingleTransaction(transaction: Transaction) {
    if (!transaction.metadata?.request_id) {
      this.logger.error(
        `Transaction ${transaction.id} lacks a request_id in metadata.`,
      );
      return;
    }

    const requestId = transaction.metadata.request_id;

    // Prevent immediate requery if transaction is too fresh (e.g., < 10 minutes old)
    // This gives the primary webhook engine enough time to process the transaction.
    const ageMs = Date.now() - transaction.createdAt.getTime();
    if (ageMs < 600000) { // 10 minutes
      return;
    }

    try {
      const response = await this.vtpassFacade.requeryTransaction(requestId);
      const content = response.content?.transactions;

      if (content?.status === 'delivered') {
        this.logger.log(
          `Transaction ${transaction.id} requery returned SUCCESS.`,
        );
        await this.transactionExecution.finalizeTransaction(
          transaction,
          TransactionStatus.SUCCESS,
          response,
        );
      } else if (content?.status === 'failed') {
        this.logger.log(
          `Transaction ${transaction.id} requery returned FAILED.`,
        );
        await this.transactionExecution.finalizeTransaction(
          transaction,
          TransactionStatus.FAILED,
          response,
          'Requery confirmed failure',
        );
      } else {
        // Still pending or processing, do nothing
        this.logger.debug(
          `Transaction ${transaction.id} is still pending on provider side.`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Requery API call failed for ${transaction.id}`, error);
    }
  }
}
