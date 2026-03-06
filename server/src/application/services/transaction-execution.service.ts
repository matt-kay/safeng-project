import {
  Injectable,
  Logger,
  ConflictException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { ITransactionRepository } from '../../application/ports/repositories/ITransactionRepository';
import type { IWalletRepository } from '../../application/ports/repositories/IWalletRepository';
import { VTPassFacadeService } from './vtpass-facade.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/entities/Transaction';
import { VTPASS_STATUS_CODES } from '../../infrastructure/services/vtpass/vtpass.errors';

@Injectable()
export class TransactionExecutionService {
  private readonly logger = new Logger(TransactionExecutionService.name);

  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepo: ITransactionRepository,
    @Inject('IWalletRepository') private readonly walletRepo: IWalletRepository,
    private readonly vtpassFacade: VTPassFacadeService,
  ) { }

  private generateRequestId(): string {
    const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const shortUuid = uuidv4().replace(/-/g, '').slice(0, 8);
    return `AfricaLagos_${dateStr}_${shortUuid}`;
  }

  async executePurchase(
    userId: string,
    payload: {
      serviceID: string;
      billersCode: string;
      variation_code?: string;
      amount: number; // In Kobo
      phone: string;
      subscription_type?: string;
    },
  ): Promise<Transaction> {
    // 1. Check for duplicates (same user, type PAYMENT, same amount within 2 mins)
    const duplicateWindowMs = 2 * 60 * 1000;
    const recentDuplicate =
      await this.transactionRepo.findRecentSimilarTransaction(
        userId,
        TransactionType.PAYMENT,
        payload.amount,
        duplicateWindowMs,
      );

    if (
      recentDuplicate &&
      recentDuplicate.metadata?.serviceID === payload.serviceID &&
      recentDuplicate.metadata?.billersCode === payload.billersCode
    ) {
      throw new ConflictException(
        'A duplicate transaction was detected. Please wait a moment before trying again.',
      );
    }

    // 2. Setup Transaction Entity
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      throw new UnprocessableEntityException('Wallet not found for user');
    }

    if (wallet.mainBalance < payload.amount) {
      throw new UnprocessableEntityException('Insufficient wallet balance');
    }

    const requestId = this.generateRequestId();
    const transactionId = uuidv4();

    const transaction = new Transaction(
      transactionId,
      wallet.id,
      userId,
      TransactionType.PAYMENT,
      'DEBIT',
      payload.amount,
      `Payment for ${payload.serviceID} - ${payload.billersCode}`,
      0, // Optional service fee
      'NGN',
      TransactionStatus.INITIATED,
      undefined, // exchangeRate
      undefined, // failureReason
      undefined, // stripePaymentIntentId
      undefined, // stripeTransactionObject
      {
        request_id: requestId,
        serviceID: payload.serviceID,
        billersCode: payload.billersCode,
        variation_code: payload.variation_code,
      },
    );

    await this.transactionRepo.save(transaction);

    // 3. Debit Wallet & Create Ledger Entry
    try {
      wallet.decrementMainBalance(payload.amount);
      await this.walletRepo.save(wallet);
    } catch (error) {
      this.logger.error(
        `Failed to debit wallet for transaction ${transactionId}`,
        error,
      );
      transaction.updateStatus(
        TransactionStatus.FAILED,
        undefined,
        'Internal Wallet Error',
      );
      await this.transactionRepo.save(transaction);
      throw new UnprocessableEntityException(
        'Failed to process payment from wallet',
      );
    }

    // 4. Call VTpass API
    try {
      const apiPayload = {
        request_id: requestId,
        serviceID: payload.serviceID,
        billersCode: payload.billersCode,
        variation_code: payload.variation_code,
        amount: payload.amount / 100, // VTpass expects Naira
        phone: payload.phone,
        subscription_type: payload.subscription_type,
      };

      this.logger.log(`Initiating VTpass payment for ${transactionId}`);
      transaction.updateStatus(TransactionStatus.PENDING);
      await this.transactionRepo.save(transaction);

      const vtpassResponse = await this.vtpassFacade.processPayment(apiPayload);
      transaction.metadata.vtpassResponse = vtpassResponse;

      // Finalization (SUCCESS/FAILED) will be handled by Webhook or Requery Engine.
      // We return successfully initiated to the user.
      if (vtpassResponse.code === VTPASS_STATUS_CODES.SUCCESS) {
        this.logger.log(
          `VTpass accepted request ${requestId} for ${transactionId}. Awaiting webhook/requery finalization.`,
        );
      } else if (vtpassResponse.code === VTPASS_STATUS_CODES.PENDING) {
        this.logger.log(
          `VTpass marked request ${requestId} as PENDING.`,
        );
      } else {
        // Technically shouldn't reach here if parseVTPassError throws, but just in case
        await this.finalizeTransaction(
          transaction,
          TransactionStatus.FAILED,
          vtpassResponse,
          vtpassResponse.response_description,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `VTpass Payment Error for ${transactionId}: ${error.message}`,
      );

      // If request failed, we only set FAILED if we are SURE it failed at VTpass.
      // If it's a network timeout, we leave it as PENDING and let Requery handle it or manual CS intervention.
      if (
        error.code !== 'NETWORK_ERROR' &&
        error.code !== VTPASS_STATUS_CODES.PENDING
      ) {
        await this.finalizeTransaction(
          transaction,
          TransactionStatus.FAILED,
          error.rawResponse,
          error.message,
        );
      }
    }

    await this.transactionRepo.save(transaction);
    return transaction;
  }

  /**
   * Finalizes a transaction with a SUCCESS or FAILED status.
   * Handles wallet refunds on failure and cashback on success.
   */
  async finalizeTransaction(
    transaction: Transaction,
    status: TransactionStatus,
    vtpassResponse?: any,
    failureReason?: string,
  ): Promise<void> {
    if (
      transaction.status === TransactionStatus.SUCCESS ||
      transaction.status === TransactionStatus.FAILED
    ) {
      this.logger.warn(
        `Attempted to finalize already finalized transaction ${transaction.id}`,
      );
      return;
    }

    transaction.updateStatus(status, undefined, failureReason);
    if (vtpassResponse) {
      transaction.metadata.vtpassResponse = vtpassResponse;
    }

    const wallet = await this.walletRepo.findByUserId(transaction.userId);
    if (!wallet) {
      this.logger.error(`Wallet not found for user ${transaction.userId} during finalization of ${transaction.id}`);
      await this.transactionRepo.save(transaction);
      return;
    }

    if (status === TransactionStatus.SUCCESS) {
      const commission =
        vtpassResponse?.data?.content?.transactions?.commission ||
        vtpassResponse?.content?.transactions?.commission;
      await this.processCashback(transaction, wallet, commission);
    } else if (status === TransactionStatus.FAILED) {
      await this.refundWallet(transaction, wallet);
    }

    await this.transactionRepo.save(transaction);
    this.logger.log(`Transaction ${transaction.id} finalized as ${status}`);
  }

  private async refundWallet(transaction: Transaction, wallet: any) {
    try {
      wallet.incrementMainBalance(transaction.amount);
      await this.walletRepo.save(wallet);

      const refundTransaction = new Transaction(
        uuidv4(),
        wallet.id,
        transaction.userId,
        TransactionType.REFUND,
        'CREDIT',
        transaction.amount,
        `Refund for Failed Payment: ${transaction.metadata?.serviceID}`,
        0,
        'NGN',
        TransactionStatus.SUCCESS,
        undefined,
        undefined,
        undefined,
        undefined,
        { referenceTransactionId: transaction.id },
      );
      await this.transactionRepo.save(refundTransaction);
    } catch (refundError) {
      this.logger.error(
        `FATAL: Failed to refund wallet for failed transaction ${transaction.id}`,
        refundError,
      );
    }
  }

  public async processCashback(
    transaction: Transaction,
    wallet: any,
    commissionStr?: number | string,
  ): Promise<void> {
    try {
      if (!commissionStr) return;
      const commissionAmount =
        typeof commissionStr === 'string'
          ? parseFloat(commissionStr)
          : commissionStr;
      if (isNaN(commissionAmount) || commissionAmount <= 0) return;

      // Cashback logic: 30% of the commission, in kobo
      const cashbackKobo = Math.floor(commissionAmount * 0.3 * 100);

      if (cashbackKobo > 0) {
        wallet.incrementCashbackBalance(cashbackKobo);
        await this.walletRepo.save(wallet);

        const cashbackTransaction = new Transaction(
          uuidv4(),
          wallet.id,
          wallet.userId,
          TransactionType.CASHBACK,
          'CREDIT',
          cashbackKobo,
          `Cashback for transaction ${transaction.id}`,
          0,
          'NGN',
          TransactionStatus.SUCCESS,
          undefined,
          undefined,
          undefined,
          undefined,
          { referenceTransactionId: transaction.id },
        );
        await this.transactionRepo.save(cashbackTransaction);
        this.logger.log(
          `Processed cashback of ${cashbackKobo} kobo for transaction ${transaction.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process cashback for transaction ${transaction.id}`,
        error,
      );
    }
  }
}
