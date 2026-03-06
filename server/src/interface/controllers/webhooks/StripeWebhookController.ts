import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { ITransactionRepository } from '../../../application/ports/repositories/ITransactionRepository';
import type { IWalletRepository } from '../../../application/ports/repositories/IWalletRepository';
import { TransactionStatus } from '../../../domain/entities/Transaction';
import { PubSubPublisherService } from '../../../notification/services/pubsub-publisher.service';
import { NotificationEventType } from '../../../notification/models/dto/notification-event.dto';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe: Stripe;
  private endpointSecret: string;

  constructor(
    private configService: ConfigService,
    @Inject('ITransactionRepository')
    private transactionRepo: ITransactionRepository,
    @Inject('IWalletRepository') private walletRepo: IWalletRepository,
    private readonly pubSubPublisher: PubSubPublisherService,
  ) {
    const secretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      'sk_test_placeholder';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    }); // fallback for type constraints
    this.endpointSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      // Need the raw body for Stripe signature verification
      const payload = (req as any).rawBody;
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.endpointSecret,
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event);
        break;
      default:
        // Unhandled event type
        break;
    }

    return res.status(200).send({ received: true });
  }

  private async handlePaymentIntentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const transactionId = paymentIntent.metadata?.transactionId;

    if (!transactionId) return; // Not our top-up

    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction || transaction.status === TransactionStatus.SUCCESS)
      return;

    // Save Stripe Raw Object
    transaction.updateStatus(TransactionStatus.SUCCESS, paymentIntent as any);
    await this.transactionRepo.save(transaction);

    // Increment Wallet
    const wallet = await this.walletRepo.findById(transaction.walletId);
    if (wallet) {
      wallet.incrementMainBalance(transaction.amount); // NGN amount without fee
      await this.walletRepo.save(wallet);
    }

    // Publish notification event to Pub/Sub
    await this.pubSubPublisher.publishNotification({
      eventType: NotificationEventType.STRIPE_TOPUP_SUCCESS,
      userId: transaction.userId,
      transactionId: transaction.id,
      amount: transaction.amount,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        currency: paymentIntent.currency,
      },
    });
  }

  private async handlePaymentIntentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const transactionId = paymentIntent.metadata?.transactionId;

    if (!transactionId) return;

    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction || transaction.status === TransactionStatus.FAILED) return;

    const reason =
      paymentIntent.last_payment_error?.message || 'Payment intent failed';
    transaction.updateStatus(
      TransactionStatus.FAILED,
      paymentIntent as any,
      reason,
    );
    await this.transactionRepo.save(transaction);

    // Publish notification event to Pub/Sub
    await this.pubSubPublisher.publishNotification({
      eventType: NotificationEventType.STRIPE_TOPUP_FAILED,
      userId: transaction.userId,
      transactionId: transaction.id,
      amount: transaction.amount,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        failureReason: reason,
      },
    });
  }
}
