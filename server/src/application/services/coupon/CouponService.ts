import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';
import type { ICouponRepository } from '../../ports/repositories/ICouponRepository';
import type { ICouponRedemptionRepository } from '../../ports/repositories/ICouponRedemptionRepository';
import type { IWalletRepository } from '../../ports/repositories/IWalletRepository';
import type { ITransactionRepository } from '../../ports/repositories/ITransactionRepository';
import type { IAuditRepository } from '../../ports/repositories/IAuditRepository';
import { Coupon, CouponStatus } from '../../../domain/entities/Coupon';
import {
  CouponRedemption,
  RedemptionStatus,
} from '../../../domain/entities/CouponRedemption';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../../domain/entities/Transaction';

@Injectable()
export class CouponService {
  constructor(
    @Inject('ICouponRepository') private readonly couponRepo: ICouponRepository,
    @Inject('ICouponRedemptionRepository')
    private readonly redemptionRepo: ICouponRedemptionRepository,
    @Inject('IWalletRepository') private readonly walletRepo: IWalletRepository,
    @Inject('ITransactionRepository')
    private readonly transactionRepo: ITransactionRepository,
    @Inject('IAuditRepository') private readonly auditRepo: IAuditRepository,
  ) { }

  async getUserCoupons(
    creatorUserId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Coupon[]> {
    return this.couponRepo.findByCreatorId(creatorUserId, limit, offset);
  }

  async createCoupon(
    creatorUserId: string,
    amountPerUse: number,
    maxUses: number,
    currency: string = 'NGN',
    name?: string,
    expiresAt?: Date,
    idempotencyKey?: string,
    code?: string,
  ): Promise<Coupon> {
    const fundedAmount = amountPerUse * maxUses;
    const wallet = await this.walletRepo.findByUserId(creatorUserId);
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.mainBalance < fundedAmount)
      throw new BadRequestException('Insufficient wallet balance');

    const finalCode = code?.trim() || this.generateCode();
    const couponId = uuidv4();
    const fundingLedgerId = uuidv4();

    // Use a default name if none provided
    const finalName =
      name?.trim() || `Gift Coupon #${finalCode.split('-').pop()}`;
    const finalExpiresAt =
      expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const db = admin.firestore();

    await db.runTransaction(async (transaction) => {
      // Re-fetch wallet within transaction
      const walletRef = db.collection('wallets').doc(wallet.id);
      const walletDoc = await transaction.get(walletRef);
      const walletData = walletDoc.data();

      if (!walletDoc.exists || walletData!.mainBalance < fundedAmount) {
        throw new BadRequestException(
          'Insufficient balance at transaction time',
        );
      }

      // Debit wallet
      transaction.update(walletRef, {
        mainBalance: admin.firestore.FieldValue.increment(-fundedAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create Transaction entry (funding)
      const transactionRef = db.collection('transactions').doc(fundingLedgerId);
      transaction.set(transactionRef, {
        walletId: wallet.id,
        userId: creatorUserId,
        type: TransactionType.COUPON_FUNDING,
        direction: 'DEBIT',
        amount: fundedAmount,
        description: `Funding Coupon: ${finalName}`,
        currency: currency,
        status: TransactionStatus.SUCCESS,
        metadata: { referenceId: couponId, idempotencyKey },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create Coupon
      const couponRef = db.collection('coupons').doc(couponId);
      transaction.set(couponRef, {
        creatorUserId,
        code: finalCode,
        name: finalName,
        currency,
        amountPerUse,
        maxUses,
        remainingUses: maxUses,
        status: CouponStatus.ACTIVE,
        expiresAt: finalExpiresAt,
        fundingLedgerId,
        expiredRefundLedgerId: null,
        revokedRefundLedgerId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    const coupon = (await this.couponRepo.findById(couponId))!;

    await this.auditRepo.save({
      action: 'coupon_created',
      actor_uid: creatorUserId,
      target_uid: creatorUserId,
      reason: 'User created a new coupon',
      before: null,
      after: {
        coupon_id: coupon.id,
        code: coupon.code,
        amount: coupon.amountPerUse,
        max_uses: coupon.maxUses,
      },
      created_at: new Date(),
    });

    return coupon;
  }

  async redeemCoupon(
    redeemerUserId: string,
    code: string,
    idempotencyKey: string,
  ): Promise<CouponRedemption> {
    const coupon = await this.couponRepo.findByCode(code);
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.canBeRedeemed())
      throw new BadRequestException('Coupon is not redeemable');

    // Check one-per-user (even before transaction for fast fail)
    const existing = await this.redemptionRepo.findByUserAndCoupon(
      redeemerUserId,
      coupon.id,
    );
    if (existing && existing.status === RedemptionStatus.SUCCESS) {
      throw new BadRequestException('ALREADY_REDEEMED');
    }

    const wallet = await this.walletRepo.findByUserId(redeemerUserId);
    if (!wallet) throw new NotFoundException('Redeemer wallet not found');

    const db = admin.firestore();
    const redemptionId = uuidv4();
    const redeemLedgerId = uuidv4();

    const successRedemption = await db.runTransaction(async (transaction) => {
      const couponRef = db.collection('coupons').doc(coupon.id);
      const couponDoc = await transaction.get(couponRef);
      const couponData = couponDoc.data()!;

      if (
        couponData.status !== CouponStatus.ACTIVE ||
        couponData.remainingUses <= 0 ||
        couponData.expiresAt.toDate() <= new Date()
      ) {
        throw new BadRequestException('Coupon no longer available');
      }

      // Check one-per-user again inside transaction
      const redemptionIdComposite = `${redeemerUserId}_${coupon.id}`;
      const redemptionRef = db
        .collection('coupon_redemptions')
        .doc(redemptionIdComposite);
      const redemptionDoc = await transaction.get(redemptionRef);
      if (
        redemptionDoc.exists &&
        redemptionDoc.data()!.status === RedemptionStatus.SUCCESS
      ) {
        throw new BadRequestException('ALREADY_REDEEMED');
      }

      // Decrement uses
      transaction.update(couponRef, {
        remainingUses: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Credit wallet
      const walletRef = db.collection('wallets').doc(wallet.id);
      transaction.update(walletRef, {
        mainBalance: admin.firestore.FieldValue.increment(coupon.amountPerUse),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create Transaction entry (redemption credit)
      const transactionRef = db.collection('transactions').doc(redeemLedgerId);
      transaction.set(transactionRef, {
        walletId: wallet.id,
        userId: redeemerUserId,
        type: TransactionType.COUPON_REDEMPTION,
        direction: 'CREDIT',
        amount: coupon.amountPerUse,
        description: `Redeemed Coupon: ${coupon.name}`,
        currency: coupon.currency,
        status: TransactionStatus.SUCCESS,
        metadata: { referenceId: coupon.id, idempotencyKey },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create Redemption record
      const redemptionData = {
        couponId: coupon.id,
        redeemerUserId: redeemerUserId,
        amount: coupon.amountPerUse,
        status: RedemptionStatus.SUCCESS,
        idempotencyKey: idempotencyKey,
        redeemLedgerId: redeemLedgerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(redemptionRef, redemptionData);

      return new CouponRedemption(
        redemptionIdComposite,
        coupon.id,
        redeemerUserId,
        coupon.amountPerUse,
        RedemptionStatus.SUCCESS,
        idempotencyKey,
        redeemLedgerId,
      );
    });

    await this.auditRepo.save({
      action: 'coupon_redeemed',
      actor_uid: redeemerUserId,
      target_uid: redeemerUserId,
      reason: 'User redeemed a coupon',
      before: null,
      after: {
        coupon_id: coupon.id,
        redemption_id: successRedemption.id,
        amount: successRedemption.amount,
      },
      created_at: new Date(),
    });

    return successRedemption;
  }

  async pauseCoupon(userId: string, couponId: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findById(couponId);
    if (!coupon || coupon.creatorUserId !== userId)
      throw new NotFoundException('Coupon not found');
    coupon.pause();
    await this.couponRepo.save(coupon);

    await this.auditRepo.save({
      action: 'coupon_paused',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User paused a coupon',
      before: { coupon_id: coupon.id, status: CouponStatus.ACTIVE },
      after: { coupon_id: coupon.id, status: CouponStatus.PAUSED },
      created_at: new Date(),
    });

    return coupon;
  }

  async resumeCoupon(userId: string, couponId: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findById(couponId);
    if (!coupon || coupon.creatorUserId !== userId)
      throw new NotFoundException('Coupon not found');
    coupon.resume();
    await this.couponRepo.save(coupon);

    await this.auditRepo.save({
      action: 'coupon_resumed',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User resumed a coupon',
      before: { coupon_id: coupon.id, status: CouponStatus.PAUSED },
      after: { coupon_id: coupon.id, status: CouponStatus.ACTIVE },
      created_at: new Date(),
    });

    return coupon;
  }

  async revokeCoupon(userId: string, couponId: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findById(couponId);
    if (!coupon || coupon.creatorUserId !== userId)
      throw new NotFoundException('Coupon not found');
    if (
      coupon.status === CouponStatus.REVOKED ||
      coupon.status === CouponStatus.EXPIRED
    ) {
      throw new BadRequestException('Coupon already revoked or expired');
    }

    const refundAmount = coupon.amountPerUse * coupon.remainingUses;
    const db = admin.firestore();
    const refundLedgerId = uuidv4();

    await db.runTransaction(async (transaction) => {
      const couponRef = db.collection('coupons').doc(couponId);
      const couponDoc = await transaction.get(couponRef);
      const couponData = couponDoc.data()!;

      if (
        couponData.status === CouponStatus.REVOKED ||
        couponData.status === CouponStatus.EXPIRED
      ) {
        throw new BadRequestException('Final state already reached');
      }

      // Set status to REVOKED
      transaction.update(couponRef, {
        status: CouponStatus.REVOKED,
        revokedRefundLedgerId: refundLedgerId,
        remainingUses: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (refundAmount > 0) {
        const wallet = await this.walletRepo.findByUserId(userId);
        if (wallet) {
          const walletRef = db.collection('wallets').doc(wallet.id);
          transaction.update(walletRef, {
            mainBalance: admin.firestore.FieldValue.increment(refundAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const transactionRef = db
            .collection('transactions')
            .doc(refundLedgerId);
          transaction.set(transactionRef, {
            walletId: wallet.id,
            userId: userId,
            type: TransactionType.COUPON_REFUND,
            direction: 'CREDIT',
            amount: refundAmount,
            description: `Refund Revoked Coupon: ${coupon.name}`,
            currency: coupon.currency,
            status: TransactionStatus.SUCCESS,
            metadata: { referenceId: coupon.id },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });

    const updatedCoupon = (await this.couponRepo.findById(couponId))!;

    await this.auditRepo.save({
      action: 'coupon_revoked',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User revoked a coupon',
      before: { coupon_id: coupon.id, status: coupon.status },
      after: {
        coupon_id: updatedCoupon.id,
        status: updatedCoupon.status,
        refund_amount: refundAmount,
      },
      created_at: new Date(),
    });

    return updatedCoupon;
  }

  async refundExpiredCoupon(couponId: string): Promise<void> {
    const coupon = await this.couponRepo.findById(couponId);
    if (!coupon) return;
    if (coupon.expiredRefundLedgerId) return; // Already refunded

    const refundAmount = coupon.amountPerUse * coupon.remainingUses;
    const db = admin.firestore();
    const refundLedgerId = uuidv4();

    await db.runTransaction(async (transaction) => {
      const couponRef = db.collection('coupons').doc(couponId);
      const couponDoc = await transaction.get(couponRef);
      const couponData = couponDoc.data()!;

      if (couponData.expiredRefundLedgerId) return; // Double check inside transaction

      // Set status to EXPIRED and record refund ID
      transaction.update(couponRef, {
        status: CouponStatus.EXPIRED,
        expiredRefundLedgerId: refundLedgerId,
        remainingUses: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (refundAmount > 0) {
        const wallet = await this.walletRepo.findByUserId(coupon.creatorUserId);
        if (wallet) {
          const walletRef = db.collection('wallets').doc(wallet.id);
          transaction.update(walletRef, {
            mainBalance: admin.firestore.FieldValue.increment(refundAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const transactionRef = db
            .collection('transactions')
            .doc(refundLedgerId);
          transaction.set(transactionRef, {
            walletId: wallet.id,
            userId: coupon.creatorUserId,
            type: TransactionType.COUPON_REFUND,
            direction: 'CREDIT',
            amount: refundAmount,
            description: `Refund Expired Coupon: ${coupon.name}`,
            currency: coupon.currency,
            status: TransactionStatus.SUCCESS,
            metadata: { referenceId: coupon.id },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });

    await this.auditRepo.save({
      action: 'coupon_expired_refund',
      actor_uid: 'system',
      target_uid: coupon.creatorUserId,
      reason: 'Automated refund for expired coupon',
      before: { coupon_id: coupon.id, status: coupon.status },
      after: {
        coupon_id: coupon.id,
        status: CouponStatus.EXPIRED,
        refund_amount: refundAmount,
      },
      created_at: new Date(),
    });
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0, O, 1, I, l
    const part = () => {
      let s = '';
      for (let i = 0; i < 4; i++) {
        s += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return s;
    };
    return `SC-${part()}-${part()}-${part()}`;
  }
}
