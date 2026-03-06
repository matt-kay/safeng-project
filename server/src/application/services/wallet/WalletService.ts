import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { IWalletRepository } from '../../ports/repositories/IWalletRepository';
import type { IPaymentCardRepository } from '../../ports/repositories/IPaymentCardRepository';
import type { ITransactionRepository } from '../../ports/repositories/ITransactionRepository';
import type { IStripeService } from '../../ports/services/IStripeService';
import type { IAuditRepository } from '../../ports/repositories/IAuditRepository';
import {
  IUserRepositoryToken,
  type IUserRepository,
} from '../../ports/user.repository.interface';
import { Wallet } from '../../../domain/entities/Wallet';
import { PaymentCard } from '../../../domain/entities/PaymentCard';
import {
  Transaction,
  TransactionStatus,
} from '../../../domain/entities/Transaction';
import { ConfigService } from '@nestjs/config';
import { PortalSettingsService } from '../PortalSettingsService';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject('IWalletRepository') private readonly walletRepo: IWalletRepository,
    @Inject('IPaymentCardRepository')
    private readonly cardRepo: IPaymentCardRepository,
    @Inject('ITransactionRepository')
    private readonly transactionRepo: ITransactionRepository,
    @Inject('IStripeService') private readonly stripeService: IStripeService,
    @Inject(IUserRepositoryToken)
    private readonly userRepository: IUserRepository,
    @Inject('IAuditRepository') private readonly auditRepo: IAuditRepository,
    private readonly portalSettings: PortalSettingsService,
    private readonly configService: ConfigService, // used to fetch admin rates for now
  ) { }

  async initiateWallet(
    userId: string,
    email: string,
    name?: string,
  ): Promise<Wallet> {
    const existing = await this.walletRepo.findByUserId(userId);
    if (existing) return existing;

    const wallet = new Wallet(uuidv4(), userId);
    await this.walletRepo.save(wallet);

    await this.auditRepo.save({
      action: 'wallet_initiated',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User initialized wallet',
      before: null,
      after: { wallet_id: wallet.id },
      created_at: new Date(),
    });

    return wallet;
  }

  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getWalletConfig(): Promise<{
    exchangeRate: number;
    topUpFeePercentage: number;
  }> {
    const settings = await this.portalSettings.getSettings();
    return {
      exchangeRate: settings.exchangeRate,
      topUpFeePercentage: settings.topUpFeePercentage,
    };
  }

  async createSetupIntent(
    userId: string,
    email: string,
    name?: string,
  ): Promise<{ clientSecret: string }> {
    // Find or create customer
    let stripeCustomerId = await this.getStripeCustomerId(userId);
    if (!stripeCustomerId) {
      stripeCustomerId = await this.stripeService.createCustomer(email, name);
      const user = await this.userRepository.findById(userId);
      if (user && user.profile) {
        user.profile.stripeCustomerId = stripeCustomerId;
        await this.userRepository.save(user);
      }
    }

    const clientSecret =
      await this.stripeService.createSetupIntent(stripeCustomerId);
    return { clientSecret };
  }

  async listCards(userId: string): Promise<PaymentCard[]> {
    return this.cardRepo.findByUserId(userId);
  }

  async attachCard(
    userId: string,
    stripePaymentMethodId: string,
  ): Promise<PaymentCard> {
    const cards = await this.cardRepo.findByUserId(userId);
    if (cards.length >= 2) {
      throw new BadRequestException('Maximum of 2 cards allowed');
    }

    // 1. Ensure we have a Stripe customer
    let stripeCustomerId = await this.getStripeCustomerId(userId);
    if (!stripeCustomerId) {
      const user = await this.userRepository.findById(userId);
      const email =
        user?.identity?.email || user?.identity?.phoneNumber?.toString() || '';
      const name = user?.profile?.first_name
        ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
        : undefined;

      stripeCustomerId = await this.stripeService.createCustomer(email, name);

      if (user && user.profile) {
        user.profile.stripeCustomerId = stripeCustomerId!;
        await this.userRepository.save(user);
      }
    }

    // 2. Attach the PM to the customer on Stripe
    try {
      await this.stripeService.attachPaymentMethodToCustomer(
        stripePaymentMethodId,
        stripeCustomerId!,
      );
    } catch (error: any) {
      // If already attached, we can ignore. Otherwise log/rethrow if critical
      if (!error.message?.includes('already been attached')) {
        this.logger.error(
          `Failed to attach PM ${stripePaymentMethodId} to customer ${stripeCustomerId}: ${error.message}`,
        );
        throw new BadRequestException(
          `Failed to link card to your account: ${error.message}`,
        );
      }
    }

    const isDefault = cards.length === 0;

    const card = new PaymentCard(
      uuidv4(),
      userId,
      stripePaymentMethodId,
      '0000', // Need to fetch from stripe if we want real data here
      'Unknown',
      12,
      2030,
      isDefault,
    );

    await this.cardRepo.save(card);

    await this.auditRepo.save({
      action: 'card_attached',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User attached a new card',
      before: null,
      after: { card_id: card.id, last4: card.last4, brand: card.brand },
      created_at: new Date(),
    });

    return card;
  }

  /**
   * Tokenizes raw card details server-side via Stripe (uses secret key, no surface restrictions),
   * then persists the resulting PaymentMethod to the user's wallet.
   */
  async tokenizeAndAttachCard(
    userId: string,
    cardDetails: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      name?: string;
    },
  ): Promise<PaymentCard> {
    const cards = await this.cardRepo.findByUserId(userId);
    if (cards.length >= 2) {
      throw new BadRequestException('Maximum of 2 cards allowed');
    }

    // 1. Create PaymentMethod on Stripe using secret key (no publishable-key surface restriction)
    const pm =
      await this.stripeService.createPaymentMethodFromCard(cardDetails);

    // 2. If we have a Stripe customer, attach the PM to them so it can be reused off-session
    const stripeCustomerId = await this.getStripeCustomerId(userId);
    if (stripeCustomerId) {
      try {
        await this.stripeService.attachPaymentMethodToCustomer(
          pm.id,
          stripeCustomerId,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to attach new PM ${pm.id} to customer ${stripeCustomerId}: ${error.message}`,
        );
        throw new BadRequestException(
          `Failed to save card: ${error.message}. Please try again.`,
        );
      }
    } else {
      throw new BadRequestException(
        'Stripe customer ID missing. Please contact support.',
      );
    }

    const isDefault = cards.length === 0;
    const cardData = pm.card!;

    const card = new PaymentCard(
      uuidv4(),
      userId,
      pm.id,
      cardData.last4 ?? '0000',
      cardData.brand ?? 'unknown',
      cardData.exp_month ?? 12,
      cardData.exp_year ?? 2030,
      isDefault,
    );

    await this.cardRepo.save(card);

    await this.auditRepo.save({
      action: 'card_attached',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User attached a new card (tokenize)',
      before: null,
      after: { card_id: card.id, last4: card.last4, brand: card.brand },
      created_at: new Date(),
    });

    return card;
  }

  async removeCard(userId: string, cardId: string): Promise<void> {
    const card = await this.cardRepo.findById(cardId);
    if (!card || card.userId !== userId)
      throw new NotFoundException('Card not found');

    try {
      await this.stripeService.detachPaymentMethod(card.stripePaymentMethodId);
    } catch (error: any) {
      // If the card is already detached or not attached to a customer, we can ignore this error
      // and proceed with local deletion. The error message from Stripe starts with "The payment method you provided is not attached to a customer"
      const isNotAttached = error.message?.includes(
        'not attached to a customer',
      );
      if (isNotAttached) {
        // Log but continue - it's already "detached" as far as we're concerned
      } else {
        // Re-throw if it's some other error (e.g. network error, invalid API key)
        throw error;
      }
    }

    await this.cardRepo.delete(cardId);

    await this.auditRepo.save({
      action: 'card_removed',
      actor_uid: userId,
      target_uid: userId,
      reason: 'User removed a card',
      before: { card_id: card.id, last4: card.last4 },
      after: null,
      created_at: new Date(),
    });
  }

  async initiateTopUp(
    userId: string,
    amountUsd: number,
    cardId?: string,
  ): Promise<any> {
    if (amountUsd <= 0)
      throw new BadRequestException('Amount must be positive');
    if (!Number.isInteger(amountUsd))
      throw new BadRequestException('Amount must be a whole number');

    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const settings = await this.portalSettings.getSettings();
    const exchangeRate = settings.exchangeRate;
    const feeMultiplier = settings.topUpFeePercentage / 100;

    // Logic:
    // 1. Stripe charges amountUsd + serviceFeeUsd
    // 2. Transaction stores net amount in NGN (kobo) and service fee in NGN (kobo)

    const serviceFeeUsd = amountUsd * feeMultiplier;
    const totalChargeUsd = amountUsd + serviceFeeUsd;
    const amountUsdCents = Math.round(totalChargeUsd * 100);

    const netNgnAmountKobo = Math.round(amountUsd * exchangeRate * 100);
    const serviceFeeNgnKobo = Math.round(serviceFeeUsd * exchangeRate * 100);

    // 3. Create INITIATED Transaction
    const transaction = Transaction.createTopUp(
      uuidv4(),
      wallet.id,
      userId,
      netNgnAmountKobo,
      serviceFeeNgnKobo,
      exchangeRate,
    );
    // Store breakdown in metadata for the client
    transaction.metadata = {
      ...transaction.metadata,
      amountUsd,
      serviceFeeUsd,
      totalChargeUsd,
      exchangeRate,
    };

    await this.transactionRepo.save(transaction);

    // 4. Create Stripe Payment Intent
    let stripeCustomerId: string | null =
      await this.getStripeCustomerId(userId);

    // If we have a cardId but no customer, something is wrong since cards are attached to customers.
    // However, to be safe, we'll try to find or create a customer here if possible.
    if (!stripeCustomerId) {
      const user = await this.userRepository.findById(userId);
      if (user && user.profile) {
        const profile = user.profile;
        const email = profile.email || profile.phone_number?.toString() || '';
        const name = profile.first_name
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : undefined;
        stripeCustomerId = await this.stripeService.createCustomer(email, name);

        profile.stripeCustomerId = stripeCustomerId;
        await this.userRepository.save(user);
      }
    }
    let paymentMethodId: string | undefined = undefined;

    if (cardId) {
      const card = await this.cardRepo.findById(cardId);
      if (card && card.userId === userId) {
        paymentMethodId = card.stripePaymentMethodId;

        // SAFEGUARD: Ensure the PaymentMethod is actually attached to this Customer on Stripe
        // Stripe requires this if both customer and payment_method are passed to PaymentIntent.create
        if (stripeCustomerId && paymentMethodId) {
          try {
            // Check if it's already attached to the CORRECT customer
            const pmData =
              await this.stripeService.getPaymentMethod(paymentMethodId);

            if (pmData.customer && pmData.customer !== stripeCustomerId) {
              throw new BadRequestException(
                `Payment method is already attached to a different customer ID (${pmData.customer}). Please re-add the card.`,
              );
            }

            if (!pmData.customer) {
              await this.stripeService.attachPaymentMethodToCustomer(
                paymentMethodId,
                stripeCustomerId,
              );
            }
          } catch (error: any) {
            if (error instanceof BadRequestException) throw error;

            const errorMessage = error.message || '';
            const isLocked = errorMessage.includes('attached to a PaymentIntent');

            if (isLocked) {
              this.logger.warn(
                `PM ${paymentMethodId} is locked by another Intent. Customer: ${stripeCustomerId}`,
              );
              throw new BadRequestException(
                'This card is temporarily locked by a previous transaction attempt. Please wait a moment or re-add the card.',
              );
            }

            if (errorMessage.includes('already been attached')) {
              // Usually fine
            } else {
              this.logger.error(
                `Failed to verify/attach PM ${paymentMethodId} to customer ${stripeCustomerId}: ${errorMessage}`,
              );
              throw new BadRequestException(
                `Failed to setup card for payment: ${errorMessage}`,
              );
            }
          }
        }
      }
    }

    let paymentIntent;
    try {
      paymentIntent = await this.stripeService.createPaymentIntent(
        amountUsdCents.toString(),
        'usd',
        stripeCustomerId,
        { transactionId: transaction.id },
        paymentMethodId,
        true, // confirm
      );

      // Handle the resulting status after automatic confirmation attempt
      if (paymentIntent.status === 'succeeded') {
        // Technically the webhook handles success, but we can fast-track the local status
        transaction.updateStatus(TransactionStatus.PENDING, paymentIntent); // still mark pending, webhook finalizes balance
      } else if (paymentIntent.status === 'requires_action') {
        // Since we don't have client SDK for 3DS yet, we fail it to prevent hanging
        transaction.updateStatus(
          TransactionStatus.FAILED,
          paymentIntent,
          'Your card requires additional authentication (3D Secure), which is currently unsupported in the app. Please try a different card.',
        );
        await this.transactionRepo.save(transaction);
        throw new BadRequestException(
          'Your card requires additional authentication (3D Secure), which is currently unsupported. Please try a different card.',
        );
      } else if (paymentIntent.status === 'requires_payment_method') {
        transaction.updateStatus(
          TransactionStatus.FAILED,
          paymentIntent,
          'Payment failed. Please check your card details or try a different card.',
        );
        await this.transactionRepo.save(transaction);
        throw new BadRequestException(
          'Payment failed. Please check your card balance or try a different card.',
        );
      } else {
        // requires_confirmation or processing -> mark pending
        transaction.updateStatus(TransactionStatus.PENDING, paymentIntent);
      }

      transaction.stripePaymentIntentId = paymentIntent.id;
      await this.transactionRepo.save(transaction);

      await this.auditRepo.save({
        action: 'topup_initiated',
        actor_uid: userId,
        target_uid: userId,
        reason: 'User initiated wallet top-up',
        before: null,
        after: {
          transaction_id: transaction.id,
          amount_usd: amountUsd,
          total_charge_usd: totalChargeUsd,
          intent_status: paymentIntent.status,
        },
        created_at: new Date(),
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      transaction.updateStatus(
        TransactionStatus.FAILED,
        undefined,
        error.message,
      );
      await this.transactionRepo.save(transaction);
      throw new BadRequestException(
        `Failed to create or confirm payment: ${error.message}`,
      );
    }

    return {
      transactionId: transaction.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      amountUsd,
      serviceFeeUsd,
      totalChargeUsd,
      netNgnAmount: netNgnAmountKobo / 100,
      serviceFeeNgn: serviceFeeNgnKobo / 100,
      exchangeRate,
    };
  }

  private async getStripeCustomerId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findById(userId);
    return user?.profile?.stripeCustomerId || null;
  }
}
