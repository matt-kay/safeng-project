import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { ITransactionRepository } from '../../application/ports/repositories/ITransactionRepository';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/entities/Transaction';

@Injectable()
export class FirebaseTransactionRepository implements ITransactionRepository {
  private readonly collectionName = 'transactions';

  constructor() { }

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async findById(id: string): Promise<Transaction | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByWalletId(walletId: string): Promise<Transaction[]> {
    const snapshot = await this.collection
      .where('walletId', '==', walletId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Transaction[]> {
    let query = this.collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (offset !== undefined) {
      query = query.offset(offset);
    }

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findPending(): Promise<Transaction[]> {
    const snapshot = await this.collection
      .where('status', '==', TransactionStatus.PENDING)
      .get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findVtuTransactionsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Transaction[]> {
    let query = this.collection
      .where('userId', '==', userId)
      .where('type', '==', TransactionType.PAYMENT)
      .orderBy('createdAt', 'desc');

    if (offset !== undefined) {
      query = query.offset(offset);
    }

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findByRequestId(requestId: string): Promise<Transaction | null> {
    const snapshot = await this.collection
      .where('metadata.request_id', '==', requestId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapToEntity(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async findRecentSimilarTransaction(
    userId: string,
    type: string,
    amount: number,
    timeWindowMs: number,
  ): Promise<Transaction | null> {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where('amount', '==', amount)
      .where('createdAt', '>=', cutoffTime)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapToEntity(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async save(transaction: Transaction): Promise<void> {
    const data = {
      walletId: transaction.walletId,
      userId: transaction.userId,
      type: transaction.type,
      direction: transaction.direction,
      amount: transaction.amount,
      description: transaction.description,
      serviceFee: transaction.serviceFee,
      currency: transaction.currency,
      status: transaction.status,
      exchangeRate: transaction.exchangeRate || null,
      failureReason: transaction.failureReason || null,
      stripePaymentIntentId: transaction.stripePaymentIntentId || null,
      stripeTransactionObject: transaction.stripeTransactionObject || null,
      metadata: transaction.metadata || {},
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
    await this.collection.doc(transaction.id).set(data, { merge: true });
  }

  private mapToEntity(id: string, data: any): Transaction {
    return new Transaction(
      id,
      data.walletId,
      data.userId,
      data.type as TransactionType,
      data.direction as 'CREDIT' | 'DEBIT',
      data.amount,
      data.description || '',
      data.serviceFee,
      data.currency,
      data.status as TransactionStatus,
      data.exchangeRate,
      data.failureReason,
      data.stripePaymentIntentId,
      data.stripeTransactionObject,
      data.metadata,
      data.createdAt ? data.createdAt.toDate() : new Date(),
      data.updatedAt ? data.updatedAt.toDate() : new Date(),
    );
  }
}
