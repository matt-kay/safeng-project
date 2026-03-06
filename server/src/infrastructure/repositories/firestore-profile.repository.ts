import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ProfileData } from '../../domain/patterns/user-aggregate.builder';

@Injectable()
export class FirestoreProfileRepository {
  private readonly collectionName = 'profiles';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get collection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  async getProfile(uid: string): Promise<ProfileData | null> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) {
      return null;
    }
    return { uid: doc.id, ...doc.data() } as ProfileData;
  }

  async saveProfile(uid: string, data: Partial<ProfileData>): Promise<void> {
    const cleanData = this.stripUndefined(data);
    await this.collection.doc(uid).set(cleanData, { merge: true });
  }

  private stripUndefined(obj: any): any {
    const result = {};
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  async deleteProfile(uid: string): Promise<void> {
    await this.collection.doc(uid).delete();
  }
}
