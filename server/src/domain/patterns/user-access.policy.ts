import { UserAggregate } from '../aggregates/user.aggregate';
import { UserStatus } from '../value-objects/user-status';
import { UserRole } from '../value-objects/user-role';

export class UserAccessPolicy {
  constructor(private readonly user: UserAggregate) {}

  canAccessSelf(): boolean {
    const status = this.user.effective_status;
    return status !== UserStatus.DELETED && status !== UserStatus.SUSPENDED;
  }

  canModifySelf(): boolean {
    const status = this.user.effective_status;
    return status === UserStatus.ACTIVE;
  }

  isAdmin(): boolean {
    return this.user.profile?.role === UserRole.ADMIN;
  }

  canAccessAdminEndpoints(): boolean {
    return this.isAdmin() && this.canModifySelf();
  }

  canViewOtherUser(targetUser: UserAggregate): boolean {
    return this.isAdmin() && this.canModifySelf();
  }
}
