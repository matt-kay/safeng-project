import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.module';
import * as admin from 'firebase-admin';

export interface UserProfile {
    uid: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone_number: string;
    role: 'customer' | 'admin';
    status: 'active' | 'inactive' | 'suspended' | 'deleted';
    fcm_tokens?: string[];
    apn_tokens?: string[];
    created_at?: admin.firestore.Timestamp;
    updated_at?: admin.firestore.Timestamp;
    deleted_at?: admin.firestore.Timestamp | null;
    deleted_by?: string | null;
    deleted_reason?: string | null;
}

@Injectable()
export class UsersRepository {
    private readonly logger = new Logger(UsersRepository.name);
    private readonly collectionName = 'profiles';

    constructor(private readonly firebase: FirebaseService) { }

    private get collection() {
        return this.firebase.firestore.collection(this.collectionName);
    }

    async findById(uid: string): Promise<UserProfile | null> {
        const doc = await this.collection.doc(uid).get();
        if (!doc.exists) return null;
        return doc.data() as UserProfile;
    }

    async create(profile: UserProfile): Promise<void> {
        const docRef = this.collection.doc(profile.uid);
        profile.created_at = admin.firestore.FieldValue.serverTimestamp() as any;
        profile.updated_at = admin.firestore.FieldValue.serverTimestamp() as any;

        await docRef.create(profile); // Fails if doc already exists
    }

    async update(uid: string, data: Partial<UserProfile>): Promise<void> {
        data.updated_at = admin.firestore.FieldValue.serverTimestamp() as any;
        await this.collection.doc(uid).update(data);
    }

    async delete(uid: string): Promise<void> {
        await this.collection.doc(uid).delete();
    }

    async addDeviceToken(uid: string, token: string, type: 'fcm' | 'apn'): Promise<void> {
        const field = type === 'fcm' ? 'fcm_tokens' : 'apn_tokens';
        await this.collection.doc(uid).update({
            [field]: admin.firestore.FieldValue.arrayUnion(token),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    async removeDeviceToken(uid: string, token: string): Promise<void> {
        await this.collection.doc(uid).update({
            fcm_tokens: admin.firestore.FieldValue.arrayRemove(token),
            apn_tokens: admin.firestore.FieldValue.arrayRemove(token),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}
