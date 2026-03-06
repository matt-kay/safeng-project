import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    const isDev = this.configService.get<string>('NODE_ENV') === 'development';

    if (isDev) {
      if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
      }
      if (!process.env.FIRESTORE_EMULATOR_HOST) {
        process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
      }
      if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
      }
    }

    if (!admin.apps.length) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || 'brisk-vtu';
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (clientEmail && privateKey) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
          projectId,
        });
      } else {
        this.app = admin.initializeApp({
          projectId,
        });
      }
    } else {
      this.app = admin.app();
    }

    // Set Firestore settings to ignore undefined properties globally
    this.app.firestore().settings({ ignoreUndefinedProperties: true });
  }

  getAuth(): admin.auth.Auth {
    return this.app.auth();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.app.firestore();
  }

  getStorage(): admin.storage.Storage {
    return this.app.storage();
  }

  async updateUserClaims(uid: string, claims: object): Promise<void> {
    const auth = this.getAuth();
    const user = await auth.getUser(uid);
    const existingClaims = user.customClaims || {};
    await auth.setCustomUserClaims(uid, { ...existingClaims, ...claims });
  }
}
