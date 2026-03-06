export class Wallet {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public mainBalance: number = 0, // in NGN Kobo (smallest unit)
    public cashbackBalance: number = 0, // in NGN Kobo (smallest unit)
    public readonly currency: string = 'NGN',
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public incrementMainBalance(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount to increment must be positive');
    }
    this.mainBalance += amount;
    this.updatedAt = new Date();
  }

  public decrementMainBalance(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount to decrement must be positive');
    }
    if (this.mainBalance < amount) {
      throw new Error('Insufficient main balance');
    }
    this.mainBalance -= amount;
    this.updatedAt = new Date();
  }

  public incrementCashbackBalance(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount to increment must be positive');
    }
    this.cashbackBalance += amount;
    this.updatedAt = new Date();
  }

  public decrementCashbackBalance(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount to decrement must be positive');
    }
    if (this.cashbackBalance < amount) {
      throw new Error('Insufficient cashback balance');
    }
    this.cashbackBalance -= amount;
    this.updatedAt = new Date();
  }
}
