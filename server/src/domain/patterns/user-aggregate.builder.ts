import { UserAggregate } from '../aggregates/user.aggregate';
import { UserIdentity } from '../entities/user-identity';
import { UserProfile } from '../entities/user-profile';
import { PhoneNumber } from '../value-objects/phone-number';
import { UserRole } from '../value-objects/user-role';
import { UserStatus } from '../value-objects/user-status';

export interface IdentityRecord {
  uid: string;
  phoneNumber: string;
  disabled?: boolean;
  displayName?: string;
  customClaims?: Record<string, any>;
  email?: string;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  tokensValidAfterTime?: string;
}

export interface ProfileData {
  uid: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  status: string;
  email?: string;
  fcm_tokens?: string[];
  apn_tokens?: string[];
  created_at?: Date | any;
  updated_at?: Date | any;
  deleted_at?: Date | any;
  deleted_by?: string;
  deleted_reason?: string;
  stripeCustomerId?: string;
}

export class UserAggregateBuilder {
  private uid: string;
  private identity: UserIdentity;
  private profile: UserProfile | null = null;

  public withIdentity(record: IdentityRecord): this {
    this.uid = record.uid;
    this.identity = new UserIdentity(
      record.uid,
      new PhoneNumber(record.phoneNumber),
      record.email,
      record.disabled,
      record.displayName,
      record.customClaims,
      record.metadata?.creationTime
        ? new Date(record.metadata.creationTime)
        : undefined,
      record.tokensValidAfterTime
        ? new Date(record.tokensValidAfterTime)
        : undefined,
      record.metadata?.lastSignInTime
        ? new Date(record.metadata.lastSignInTime)
        : undefined,
    );
    return this;
  }

  public withProfile(data: ProfileData | null): this {
    if (data) {
      this.profile = new UserProfile(
        data.uid,
        data.first_name,
        data.last_name,
        new PhoneNumber(data.phone_number),
        data.role as UserRole,
        data.status as UserStatus,
        data.email,
        data.fcm_tokens || [],
        data.apn_tokens || [],
        data.created_at?.toDate ? data.created_at.toDate() : data.created_at,
        data.updated_at?.toDate ? data.updated_at.toDate() : data.updated_at,
        data.deleted_at?.toDate ? data.deleted_at.toDate() : data.deleted_at,
        data.deleted_by,
        data.deleted_reason,
        data.stripeCustomerId,
      );
    } else {
      this.profile = null;
    }
    return this;
  }

  public build(): UserAggregate {
    if (!this.identity) {
      throw new Error('UserIdentity is required to build UserAggregate');
    }
    return new UserAggregate(this.uid, this.identity, this.profile);
  }
}
