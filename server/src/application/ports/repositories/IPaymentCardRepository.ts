import { PaymentCard } from '../../../domain/entities/PaymentCard';

export interface IPaymentCardRepository {
  findById(id: string): Promise<PaymentCard | null>;
  findByUserId(userId: string): Promise<PaymentCard[]>;
  findByStripePaymentMethodId(
    stripePaymentMethodId: string,
  ): Promise<PaymentCard | null>;
  save(card: PaymentCard): Promise<void>;
  delete(id: string): Promise<void>;
}
