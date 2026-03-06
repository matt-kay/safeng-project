import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { Inject, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import type { IPortalSettingsRepository } from '../ports/repositories/IPortalSettingsRepository';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';

export class GetUserProfileQuery {
  constructor(
    public readonly uid: string,
    public readonly targetUid: string,
  ) { }
}

@QueryHandler(GetUserProfileQuery)
export class GetUserProfileHandler implements IQueryHandler<GetUserProfileQuery> {
  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
    @Inject('IPortalSettingsRepository') private readonly settingsRepo: IPortalSettingsRepository,
  ) { }

  async execute(query: GetUserProfileQuery) {
    const { uid, targetUid } = query;
    const isSelf = uid === targetUid;

    const callerUser = await this.userRepo.findById(uid);
    if (!callerUser) {
      if (!isSelf) throw new NotFoundException('Caller not found');
    }

    const targetUser = isSelf
      ? callerUser
      : await this.userRepo.findById(targetUid);

    if (!targetUser) throw new NotFoundException('User not found');

    if (isSelf) {
      const policy = new UserAccessPolicy(targetUser);
      if (!policy.canAccessSelf() && !targetUser.isProfileMissing()) {
        if (targetUser.effective_status !== 'inactive') {
          throw new ForbiddenException('User is suspended or deleted');
        }
      }

      const settings = await this.settingsRepo.getSettings();
      if (settings.maintenanceMode && targetUser.profile?.role !== 'admin') {
        throw new ServiceUnavailableException('System is currently undergoing maintenance. Please try again later.');
      }

      if (targetUser.isProfileMissing()) {
        // Return 200 with profile_missing flag instead of 404
        return this.mapToSelfView(targetUser, targetUid);
      }

      return this.mapToSelfView(targetUser, targetUid);
    } else {
      if (!callerUser) throw new ForbiddenException();
      const policy = new UserAccessPolicy(callerUser);
      if (!policy.canViewOtherUser(targetUser)) {
        throw new NotFoundException('User not found');
      }
      const targetPolicy = new UserAccessPolicy(targetUser);
      if (!targetPolicy.canAccessSelf() && !policy.isAdmin()) {
        throw new ForbiddenException();
      }
      return this.mapToAdminView(targetUser);
    }
  }

  private mapToSelfView(user: UserAggregate, uid: string) {
    const identityEmail = user.identity.email;
    const identityPhone = user.identity.phoneNumber.getValue;

    if (user.isProfileMissing()) {
      let firstName = '';
      let lastName = '';
      if (user.identity.displayName) {
        const parts = user.identity.displayName.split(' ');
        firstName = parts[0];
        lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      }

      return {
        uid: uid,
        first_name: firstName,
        last_name: lastName,
        email: identityEmail || '',
        phone_number: identityPhone,
        identity: {
          ...user.identity,
          phoneNumber: identityPhone,
          email: identityEmail,
          claims: undefined,
        },
        profile: null,
        profile_missing: true,
      };
    }
    return {
      uid: uid,
      first_name: user.profile!.first_name,
      last_name: user.profile!.last_name,
      phone_number: user.profile!.phone_number.getValue,
      email: user.profile!.email || identityEmail || '',
      role: user.profile!.role,
      status: user.profile!.status,
      created_at: user.profile!.created_at,
      updated_at: user.profile!.updated_at,
      effective_status: user.effective_status,
      // Keep identity for admin/discovery if needed, but the main model is flat
      identity: {
        phoneNumber: user.identity.phoneNumber.getValue,
        email: identityEmail,
        displayName: user.identity.displayName,
      },
    };
  }

  private mapToAdminView(user: UserAggregate) {
    const view: any = this.mapToSelfView(user, user.uid);
    view.identity = {
      ...view.identity,
      disabled: user.identity.disabled,
      claims: user.identity.claims,
      creationTimestamp: user.identity.creationTimestamp,
      lastSignInTimestamp: user.identity.lastSignInTimestamp,
    };
    return view;
  }
}
