import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FcmPayloadDto } from '../../models/dto/notification.dto';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (projectId && clientEmail && privateKey) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      this.initialized = true;
    } else {
      this.logger.warn(
        'Firebase credentials missing. FCM will run in Development Mode only.',
      );
    }
  }

  async sendSingle(token: string, payload: FcmPayloadDto): Promise<boolean> {
    const isDev =
      this.configService.get<string>('environment') === 'development';
    if (isDev) {
      this.logger.log(
        `[Dev Mode] Sending FCM token=${token}, payload=${JSON.stringify(payload)}`,
      );
      return true;
    }

    if (!this.initialized) {
      this.logger.error('Cannot send FCM: Firebase not initialized');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image_url,
        },
        data: payload.data as { [key: string]: string },
      };
      await admin.messaging().send(message);
      this.logger.log(`Successfully sent FCM to ${token}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send FCM to ${token}`, error.stack);
      return false;
    }
  }

  async sendBatch(
    tokens: string[],
    payload: FcmPayloadDto,
  ): Promise<{ successCount: number; failureCount: number }> {
    const isDev =
      this.configService.get<string>('environment') === 'development';
    if (isDev) {
      this.logger.log(
        `[Dev Mode] Sending Batch FCM tokens=${tokens.length}, payload=${JSON.stringify(payload)}`,
      );
      return { successCount: tokens.length, failureCount: 0 };
    }

    if (!this.initialized) {
      this.logger.error('Cannot send batch FCM: Firebase not initialized');
      return { successCount: 0, failureCount: tokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image_url,
        },
        data: payload.data as { [key: string]: string },
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Batch FCM result: ${response.successCount} success, ${response.failureCount} failed`,
      );
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send batch FCM`, error.stack);
      return { successCount: 0, failureCount: tokens.length };
    }
  }
}
