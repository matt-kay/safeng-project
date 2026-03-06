import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../application/ports/user.repository.interface';
import { UserAggregateBuilder } from '../../domain/patterns/user-aggregate.builder';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { FirestoreProfileRepository } from './firestore-profile.repository';
import { UserStatus } from '../../domain/value-objects/user-status';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    private readonly authProvider: FirebaseAdminProvider,
    private readonly profileRepo: FirestoreProfileRepository,
  ) {}

  async findById(uid: string): Promise<UserAggregate | null> {
    const identity = await this.authProvider.getUserIdentity(uid);
    if (!identity) return null;

    const profileData = await this.profileRepo.getProfile(uid);

    return new UserAggregateBuilder()
      .withIdentity(identity)
      .withProfile(profileData)
      .build();
  }

  async save(aggregate: UserAggregate): Promise<void> {
    const { uid, identity, profile } = aggregate;

    if (profile) {
      await this.profileRepo.saveProfile(uid, {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_number: profile.phone_number.getValue,
        role: profile.role,
        status: profile.status,
        email: profile.email,
        fcm_tokens: profile.fcm_tokens,
        apn_tokens: profile.apn_tokens,
        created_at: profile.created_at || new Date(),
        updated_at: profile.updated_at || new Date(),
        deleted_at: profile.deleted_at,
        deleted_by: profile.deleted_by,
        deleted_reason: profile.deleted_reason,
        stripeCustomerId: profile.stripeCustomerId,
      });

      const updates: any = {};
      if (profile.first_name || profile.last_name) {
        updates.displayName =
          `${profile.first_name} ${profile.last_name}`.trim();
      }
      if (identity.disabled !== undefined) {
        updates.disabled = identity.disabled;
      }

      await this.authProvider.updateUserIdentity(uid, updates);
      await this.authProvider.setCustomUserClaims(uid, {
        role: profile.role,
        status: profile.status,
      });
    }
  }

  async softDelete(
    uid: string,
    reason?: string,
    deletedBy?: string,
  ): Promise<void> {
    const now = new Date();
    await this.profileRepo.saveProfile(uid, {
      status: UserStatus.DELETED as any,
      deleted_at: now,
      deleted_by: deletedBy,
      deleted_reason: reason,
      updated_at: now,
    });

    await this.authProvider.updateUserIdentity(uid, { disabled: true });
    await this.authProvider.revokeRefreshTokens(uid);
    await this.authProvider.setCustomUserClaims(uid, {
      status: UserStatus.DELETED,
    });
  }

  async permanentDelete(
    uid: string,
    alsoDeleteProfile: boolean,
  ): Promise<void> {
    await this.authProvider.deleteUser(uid);
    if (alsoDeleteProfile) {
      await this.profileRepo.deleteProfile(uid);
    } else {
      await this.profileRepo.saveProfile(uid, {
        first_name: 'Deleted',
        last_name: 'User',
        phone_number: '+00000000000',
        email: '',
        fcm_tokens: [],
        apn_tokens: [],
        stripeCustomerId: null as any,
      });
    }
  }
}
