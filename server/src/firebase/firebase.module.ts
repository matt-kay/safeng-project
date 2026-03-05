import { Module, Global, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Relies on GOOGLE_APPLICATION_CREDENTIALS
      });
    }
  }

  get auth() {
    return admin.auth();
  }

  get firestore() {
    return admin.firestore();
  }
}

@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
