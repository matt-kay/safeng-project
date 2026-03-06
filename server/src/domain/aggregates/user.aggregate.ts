import { UserIdentity } from '../entities/user-identity';
import { UserProfile } from '../entities/user-profile';
import { UserStatus } from '../value-objects/user-status';

export class UserAggregate {
  constructor(
    public readonly uid: string,
    public readonly identity: UserIdentity,
    public profile: UserProfile | null,
  ) {}

  get effective_status(): UserStatus | 'profile_missing' {
    if (this.profile?.status === UserStatus.DELETED) {
      return UserStatus.DELETED;
    }
    if (this.profile?.status === UserStatus.SUSPENDED) {
      return UserStatus.SUSPENDED;
    }
    if (this.identity.disabled === true) {
      return UserStatus.INACTIVE;
    }
    if (!this.profile) {
      return 'profile_missing';
    }
    return this.profile.status;
  }

  isProfileMissing(): boolean {
    return this.profile === null;
  }
}
