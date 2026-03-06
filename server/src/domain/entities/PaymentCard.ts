export class PaymentCard {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly stripePaymentMethodId: string,
    public readonly last4: string,
    public readonly brand: string,
    public readonly expiryMonth: number,
    public readonly expiryYear: number,
    public isDefault: boolean = false,
    public readonly createdAt: Date = new Date(),
  ) {}

  public setAsDefault(): void {
    this.isDefault = true;
  }

  public unsetAsDefault(): void {
    this.isDefault = false;
  }
}
