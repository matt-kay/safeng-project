export enum BeneficiaryStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export class Beneficiary {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly serviceType: string,
    public readonly providerServiceId: string,
    public readonly billerCode: string,
    public billerName: string,
    public nickname: string,
    public isFavorite: boolean = false,
    public status: BeneficiaryStatus = BeneficiaryStatus.UNVERIFIED,
    public metadata: Record<string, any> = {},
    public lastVerifiedAt?: Date,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public updateDetails(nickname?: string, isFavorite?: boolean): void {
    if (nickname !== undefined) this.nickname = nickname;
    if (isFavorite !== undefined) this.isFavorite = isFavorite;
    this.updatedAt = new Date();
  }

  public verify(billerName: string, metadata: Record<string, any> = {}): void {
    this.billerName = billerName;
    this.status = BeneficiaryStatus.VERIFIED;
    this.metadata = metadata;
    this.lastVerifiedAt = new Date();
    this.updatedAt = new Date();
  }
}
