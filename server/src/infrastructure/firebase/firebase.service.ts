import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const isDev = this.configService.get<string>('NODE_ENV') === 'development';

    if (isDev) {
      if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
      }
      if (!process.env.FIRESTORE_EMULATOR_HOST) {
        process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
      }
    }

    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        projectId:
          this.configService.get<string>('FIREBASE_PROJECT_ID') || 'brisk-vtu',
      });
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
}
