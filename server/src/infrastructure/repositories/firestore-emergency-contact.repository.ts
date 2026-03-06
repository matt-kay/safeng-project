import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { EmergencyContact } from '../../domain/value-objects/emergency-contact';

@Injectable()
export class FirestoreEmergencyContactRepository {
    private readonly collectionName = 'emergency_contacts';

    constructor(private readonly firebaseService: FirebaseService) { }

    private get collection() {
        return this.firebaseService.getFirestore().collection(this.collectionName);
    }

    async getContacts(uid: string): Promise<EmergencyContact[]> {
        const doc = await this.collection.doc(uid).get();
        if (!doc.exists) {
            return [];
        }
        const data = doc.data();
        return (data?.contacts as EmergencyContact[]) || [];
    }

    async saveContacts(uid: string, contacts: EmergencyContact[]): Promise<void> {
        await this.collection.doc(uid).set({
            userId: uid,
            contacts
        }, { merge: true });
    }

    async deleteContacts(uid: string): Promise<void> {
        await this.collection.doc(uid).delete();
    }
}
