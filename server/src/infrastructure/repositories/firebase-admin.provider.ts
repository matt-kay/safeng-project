import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { IdentityRecord } from '../../domain/patterns/user-aggregate.builder';

@Injectable()
export class FirebaseAdminProvider {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getUserIdentity(uid: string): Promise<IdentityRecord | null> {
    try {
      const user = await this.firebaseService.getAuth().getUser(uid);
      return {
        uid: user.uid,
        phoneNumber: user.phoneNumber as string,
        email: user.email,
        disabled: user.disabled,
        displayName: user.displayName,
        customClaims: user.customClaims,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime,
        },
        tokensValidAfterTime: user.tokensValidAfterTime,
      };
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  async updateUserIdentity(
    uid: string,
    data: { disabled?: boolean; displayName?: string },
  ): Promise<void> {
    try {
      await this.firebaseService.getAuth().updateUser(uid, data);
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') throw e;
    }
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    try {
      await this.firebaseService.getAuth().revokeRefreshTokens(uid);
    } catch (e: any) {}
  }

  async setCustomUserClaims(uid: string, claims: any): Promise<void> {
    try {
      await this.firebaseService.getAuth().setCustomUserClaims(uid, claims);
    } catch (e: any) {}
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await this.firebaseService.getAuth().deleteUser(uid);
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
  }
}
