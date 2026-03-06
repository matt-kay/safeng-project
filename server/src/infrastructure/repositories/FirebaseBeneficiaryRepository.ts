import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { IBeneficiaryRepository } from '../../application/ports/repositories/IBeneficiaryRepository';
import {
  Beneficiary,
  BeneficiaryStatus,
} from '../../domain/entities/Beneficiary';

@Injectable()
export class FirebaseBeneficiaryRepository implements IBeneficiaryRepository {
  private readonly collectionName = 'beneficiaries';

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async findById(id: string): Promise<Beneficiary | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByUserId(userId: string): Promise<Beneficiary[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findByUserIdAndServiceType(
    userId: string,
    serviceType: string,
  ): Promise<Beneficiary[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('serviceType', '==', serviceType)
      .orderBy('updatedAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async save(beneficiary: Beneficiary): Promise<void> {
    const data = {
      userId: beneficiary.userId,
      serviceType: beneficiary.serviceType,
      providerServiceId: beneficiary.providerServiceId,
      billerCode: beneficiary.billerCode,
      billerName: beneficiary.billerName,
      nickname: beneficiary.nickname,
      isFavorite: beneficiary.isFavorite,
      status: beneficiary.status,
      metadata: beneficiary.metadata,
      lastVerifiedAt: beneficiary.lastVerifiedAt || null,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt,
    };
    await this.collection.doc(beneficiary.id).set(data, { merge: true });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  private mapToEntity(id: string, data: any): Beneficiary {
    return new Beneficiary(
      id,
      data.userId,
      data.serviceType,
      data.providerServiceId,
      data.billerCode,
      data.billerName,
      data.nickname,
      data.isFavorite || false,
      (data.status as BeneficiaryStatus) || BeneficiaryStatus.UNVERIFIED,
      data.metadata || {},
      data.lastVerifiedAt ? data.lastVerifiedAt.toDate() : undefined,
      data.createdAt ? data.createdAt.toDate() : new Date(),
      data.updatedAt ? data.updatedAt.toDate() : new Date(),
    );
  }
}
