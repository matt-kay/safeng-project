export enum NotificationEventType {
    VTPASS_SUCCESS = 'vtpass.transaction.success',
    VTPASS_FAILED = 'vtpass.transaction.failed',
    STRIPE_TOPUP_SUCCESS = 'stripe.topup.success',
    STRIPE_TOPUP_FAILED = 'stripe.topup.failed',
}

export interface NotificationEventDto {
    eventType: NotificationEventType;
    userId: string;
    transactionId: string;
    amount: number; // in kobo
    metadata?: Record<string, any>;
}
