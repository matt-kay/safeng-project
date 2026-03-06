import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ICouponRedemptionRepository } from '../../application/ports/repositories/ICouponRedemptionRepository';
import {
  CouponRedemption,
  RedemptionStatus,
} from '../../domain/entities/CouponRedemption';

@Injectable()
export class FirebaseCouponRedemptionRepository implements ICouponRedemptionRepository {
  private readonly collectionName = 'coupon_redemptions';

  private get collection() {
    return admin.firestore().collection(this.collectionName);
  }

  async findById(id: string): Promise<CouponRedemption | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEntity(doc.id, doc.data());
  }

  async findByCouponId(couponId: string): Promise<CouponRedemption[]> {
    const snapshot = await this.collection
      .where('couponId', '==', couponId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => this.mapToEntity(doc.id, doc.data()));
  }

  async findByUserAndCoupon(
    userId: string,
    couponId: string,
  ): Promise<CouponRedemption | null> {
    // We use a composite ID for one-per-user-per-coupon enforcement
    const docId = `${userId}_${couponId}`;
    const doc = await this.collection.doc(docId).get();
    if (!doc.exists) {
      // Fallback to query if docId isn't used consistently
      const snapshot = await this.collection
        .where('redeemerUserId', '==', userId)
        .where('couponId', '==', couponId)
        .where('status', '==', RedemptionStatus.SUCCESS)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      return this.mapToEntity(snapshot.docs[0].id, snapshot.docs[0].data());
    }
    return this.mapToEntity(doc.id, doc.data());
  }

  async save(redemption: CouponRedemption): Promise<void> {
    const data = {
      couponId: redemption.couponId,
      redeemerUserId: redemption.redeemerUserId,
      amount: redemption.amount,
      status: redemption.status,
      idempotencyKey: redemption.idempotencyKey,
      redeemLedgerId: redemption.redeemLedgerId,
      createdAt: redemption.createdAt,
    };
    // Use composite ID if it's a success redemption to enforce one-per-user
    const docId =
      redemption.status === RedemptionStatus.SUCCESS
        ? `${redemption.redeemerUserId}_${redemption.couponId}`
        : redemption.id;

    await this.collection.doc(docId).set(data, { merge: true });
  }

  private mapToEntity(id: string, data: any): CouponRedemption {
    return new CouponRedemption(
      id,
      data.couponId,
      data.redeemerUserId,
      data.amount,
      data.status as RedemptionStatus,
      data.idempotencyKey,
      data.redeemLedgerId,
      data.createdAt.toDate(),
    );
  }
}
