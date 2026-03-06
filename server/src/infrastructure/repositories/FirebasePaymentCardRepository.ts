import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { IPaymentCardRepository } from '../../application/ports/repositories/IPaymentCardRepository';
import { PaymentCard } from '../../domain/entities/PaymentCard';

@Injectable()
export class FirebasePaymentCardRepository implements IPaymentCardRepository {
  private readonly collectionName = 'payment_cards';

  constructor() {}

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async findById(id: string): Promise<PaymentCard | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByUserId(userId: string): Promise<PaymentCard[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findByStripePaymentMethodId(
    stripePaymentMethodId: string,
  ): Promise<PaymentCard | null> {
    const snapshot = await this.collection
      .where('stripePaymentMethodId', '==', stripePaymentMethodId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapToEntity(doc.id, doc.data());
  }

  async save(card: PaymentCard): Promise<void> {
    const data = {
      userId: card.userId,
      stripePaymentMethodId: card.stripePaymentMethodId,
      last4: card.last4,
      brand: card.brand,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      isDefault: card.isDefault,
      createdAt: card.createdAt,
    };
    await this.collection.doc(card.id).set(data);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  private mapToEntity(id: string, data: any): PaymentCard {
    return new PaymentCard(
      id,
      data.userId,
      data.stripePaymentMethodId,
      data.last4,
      data.brand,
      data.expiryMonth,
      data.expiryYear,
      data.isDefault,
      data.createdAt ? data.createdAt.toDate() : new Date(),
    );
  }
}
