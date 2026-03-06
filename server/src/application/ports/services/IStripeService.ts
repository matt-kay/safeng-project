export interface CardDetails {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  name?: string;
}

export interface IStripeService {
  createCustomer(email: string, name?: string): Promise<string>;
  getCustomer(customerId: string): Promise<any>;
  createSetupIntent(customerId: string): Promise<string>;
  listPaymentMethods(customerId: string): Promise<any[]>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  createPaymentIntent(
    amountStr: string,
    currency: string,
    customerId: string | null,
    metadata: any,
    paymentMethodId?: string,
    confirm?: boolean,
    returnUrl?: string,
  ): Promise<any>;
  /** Creates a Stripe PaymentMethod server-side from raw card details. Returns the full PM object. */
  createPaymentMethodFromCard(card: CardDetails): Promise<any>;
  /** Retrieves a Stripe PaymentMethod. */
  getPaymentMethod(paymentMethodId: string): Promise<any>;
  /** Attaches an existing PaymentMethod to a Stripe Customer. */
  attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string,
  ): Promise<void>;
}
