import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ICouponRepository } from '../../application/ports/repositories/ICouponRepository';
import { Coupon, CouponStatus } from '../../domain/entities/Coupon';

@Injectable()
export class FirebaseCouponRepository implements ICouponRepository {
  private readonly collectionName = 'coupons';

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async findById(id: string): Promise<Coupon | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const snapshot = await this.collection
      .where('code', '==', code)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByCreatorId(
    creatorUserId: string,
    limit?: number,
    offset?: number,
  ): Promise<Coupon[]> {
    let query = this.collection
      .where('creatorUserId', '==', creatorUserId)
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

  async findExpiredUnrefunded(): Promise<Coupon[]> {
    const now = new Date();
    const snapshot = await this.collection
      .where('status', 'in', [CouponStatus.ACTIVE, CouponStatus.PAUSED])
      .where('expiresAt', '<=', now)
      .get();

    // Firestore doesn't support multiple inequality filters easily without composite indexes,
    // but since we need 'expiredRefundLedgerId == null', and we already filter by status and expiresAt,
    // we can filter the rest in memory if needed, or ensure the query is optimized.
    // Actually, we can filter for expiredRefundLedgerId == null in memory to avoid index complexity for now.
    return snapshot.docs
      .map((doc) => this.mapToEntity(doc.id, doc.data()))
      .filter((c) => c.expiredRefundLedgerId === null);
  }

  async save(coupon: Coupon): Promise<void> {
    const data = {
      creatorUserId: coupon.creatorUserId,
      code: coupon.code,
      name: coupon.name,
      currency: coupon.currency,
      amountPerUse: coupon.amountPerUse,
      maxUses: coupon.maxUses,
      remainingUses: coupon.remainingUses,
      status: coupon.status,
      expiresAt: coupon.expiresAt,
      fundingLedgerId: coupon.fundingLedgerId,
      expiredRefundLedgerId: coupon.expiredRefundLedgerId,
      revokedRefundLedgerId: coupon.revokedRefundLedgerId,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
    await this.collection.doc(coupon.id).set(data, { merge: true });
  }

  private mapToEntity(id: string, data: any): Coupon {
    return new Coupon(
      id,
      data.creatorUserId,
      data.code,
      data.name,
      data.currency,
      data.amountPerUse,
      data.maxUses,
      data.remainingUses,
      data.status as CouponStatus,
      data.expiresAt.toDate(),
      data.fundingLedgerId,
      data.expiredRefundLedgerId,
      data.revokedRefundLedgerId,
      data.createdAt.toDate(),
      data.updatedAt.toDate(),
    );
  }
}
