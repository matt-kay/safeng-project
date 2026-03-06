import { Transaction } from '../../../domain/entities/Transaction';

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByWalletId(walletId: string): Promise<Transaction[]>;
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Transaction[]>;
  findPending(): Promise<Transaction[]>;
  findByRequestId(requestId: string): Promise<Transaction | null>;
  findRecentSimilarTransaction(
    userId: string,
    type: string,
    amount: number,
    timeWindowMs: number,
  ): Promise<Transaction | null>;
  findVtuTransactionsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Transaction[]>;
  save(transaction: Transaction): Promise<void>;
}
