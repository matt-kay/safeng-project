import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type {
  IStripeService,
  CardDetails,
} from '../../application/ports/services/IStripeService';

@Injectable()
export class StripeService implements IStripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY not found in environment variables');
    }
    this.stripe = new Stripe(apiKey || 'sk_test_placeholder', {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  async createCustomer(email: string, name?: string): Promise<string> {
    const customer = await this.stripe.customers.create({ email, name });
    return customer.id;
  }

  async getCustomer(
    customerId: string,
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.stripe.customers.retrieve(customerId);
  }

  async createSetupIntent(customerId: string): Promise<string> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
    });
    if (!setupIntent.client_secret) {
      throw new Error('Could not create SetupIntent client secret');
    }
    return setupIntent.client_secret;
  }

  async listPaymentMethods(
    customerId: string,
  ): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Creates a Stripe PaymentMethod server-side from raw card details.
   * Uses the secret key — bypasses Stripe's client-side surface restrictions.
   */
  async createPaymentMethodFromCard(
    card: CardDetails,
  ): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: card.number,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        cvc: card.cvc,
      },
      billing_details: card.name ? { name: card.name } : undefined,
    });
  }

  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string,
  ): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async createPaymentIntent(
    amountCents: string,
    currency: string,
    customerId: string | null,
    metadata: any,
    paymentMethodId?: string,
    confirm: boolean = false,
    returnUrl?: string,
  ): Promise<any> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: parseInt(amountCents, 10),
      currency: currency.toLowerCase(),
      metadata,
    };

    if (customerId) {
      params.customer = customerId;
    }

    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
    }

    if (confirm && paymentMethodId) {
      params.confirm = true;
      params.off_session = true; // Attempt to confirm without user interaction
      // Note: If 3DS is required, off_session=true will cause it to fail with requires_action/requires_payment_method
      // depending on Stripe settings, which we will handle in WalletService.
    }

    const paymentIntent = await this.stripe.paymentIntents.create(params);
    return paymentIntent;
  }
}
