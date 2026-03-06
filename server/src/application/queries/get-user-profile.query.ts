import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IUserRepositoryToken } from '../ports/user.repository.interface';
import type { IUserRepository } from '../ports/user.repository.interface';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserAccessPolicy } from '../../domain/patterns/user-access.policy';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { FirestoreEmergencyContactRepository } from '../../infrastructure/repositories/firestore-emergency-contact.repository';
import { EmergencyContact } from '../../domain/value-objects/emergency-contact';

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
    private readonly emergencyContactRepo: FirestoreEmergencyContactRepository,
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

      const emergencyContacts = await this.emergencyContactRepo.getContacts(targetUid);

      if (targetUser.isProfileMissing()) {
        // Return 200 with profile_missing flag instead of 404
        return this.mapToSelfView(targetUser, targetUid, emergencyContacts);
      }

      return this.mapToSelfView(targetUser, targetUid, emergencyContacts);
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

      const emergencyContacts = await this.emergencyContactRepo.getContacts(targetUid);
      return this.mapToAdminView(targetUser, emergencyContacts);
    }
  }

  private mapToSelfView(user: UserAggregate, uid: string, emergencyContacts: EmergencyContact[] = []) {
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
      sos_subscription_active: user.profile!.sos_subscription_active,
      // Keep identity for admin/discovery if needed, but the main model is flat
      identity: {
        phoneNumber: user.identity.phoneNumber.getValue,
        email: identityEmail,
        displayName: user.identity.displayName,
      },
    };
  }

  private mapToAdminView(user: UserAggregate, emergencyContacts: EmergencyContact[] = []) {
    const view: any = this.mapToSelfView(user, user.uid, emergencyContacts);
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
