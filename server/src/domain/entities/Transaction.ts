export enum TransactionType {
  TOP_UP = 'TOP_UP',
  PAYMENT = 'PAYMENT',
  CASHBACK = 'CASHBACK',
  REFUND = 'REFUND',
  COUPON_FUNDING = 'COUPON_FUNDING',
  COUPON_REDEMPTION = 'COUPON_REDEMPTION',
  COUPON_REFUND = 'COUPON_REFUND',
}

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface StripeTransactionObject {
  id?: string;
  object?: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  status?: string;
  [key: string]: any;
}

export class Transaction {
  constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly userId: string,
    public readonly type: TransactionType,
    public readonly direction: 'CREDIT' | 'DEBIT',
    public readonly amount: number, // in NGN Kobo
    public readonly description: string,
    public readonly serviceFee: number = 0, // in NGN Kobo
    public readonly currency: string = 'NGN',
    public status: TransactionStatus = TransactionStatus.INITIATED,
    public readonly exchangeRate?: number, // Admin rate at time of creation
    public failureReason?: string | null,
    public stripePaymentIntentId?: string | null,
    public stripeTransactionObject?: StripeTransactionObject | null,
    public metadata: Record<string, any> = {},
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public updateStatus(
    newStatus: TransactionStatus,
    stripeObject?: StripeTransactionObject,
    failureReason?: string,
  ): void {
    this.status = newStatus;
    this.updatedAt = new Date();
    if (stripeObject) {
      this.stripeTransactionObject = stripeObject;
    }
    if (failureReason) {
      this.failureReason = failureReason;
    }
  }

  static createTopUp(
    id: string,
    walletId: string,
    userId: string,
    amountNgn: number,
    serviceFee: number,
    exchangeRate: number,
    description: string = 'Wallet Top-up',
  ): Transaction {
    return new Transaction(
      id,
      walletId,
      userId,
      TransactionType.TOP_UP,
      'CREDIT',
      amountNgn,
      description,
      serviceFee,
      'NGN',
      TransactionStatus.INITIATED,
      exchangeRate,
    );
  }
}
