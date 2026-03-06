import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { IWalletRepository } from '../../application/ports/repositories/IWalletRepository';
import { Wallet } from '../../domain/entities/Wallet';

@Injectable()
export class FirebaseWalletRepository implements IWalletRepository {
  private readonly collectionName = 'wallets';

  constructor() {}

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async findById(id: string): Promise<Wallet | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapToEntity(doc.id, doc.data());
  }

  async save(wallet: Wallet): Promise<void> {
    const data = {
      userId: wallet.userId,
      mainBalance: wallet.mainBalance,
      cashbackBalance: wallet.cashbackBalance,
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
    await this.collection.doc(wallet.id).set(data, { merge: true });
  }

  private mapToEntity(id: string, data: any): Wallet {
    const wallet = new Wallet(
      id,
      data.userId,
      data.mainBalance,
      data.cashbackBalance,
      data.currency,
      data.createdAt ? data.createdAt.toDate() : new Date(),
      data.updatedAt ? data.updatedAt.toDate() : new Date(),
    );
    return wallet;
  }
}
