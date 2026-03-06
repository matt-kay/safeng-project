import { PhoneNumber } from '../value-objects/phone-number';

export class UserIdentity {
  constructor(
    public readonly uid: string,
    public readonly phoneNumber: PhoneNumber,
    public readonly email?: string,
    public readonly disabled?: boolean,
    public readonly displayName?: string,
    public readonly claims?: Record<string, any>,
    public readonly creationTimestamp?: Date,
    public readonly lastRefreshTimestamp?: Date,
    public readonly lastSignInTimestamp?: Date,
  ) {}
}
