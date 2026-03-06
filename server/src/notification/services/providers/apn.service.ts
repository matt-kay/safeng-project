import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apn from 'apn';
import { ApnPayloadDto } from '../../models/dto/notification.dto';

@Injectable()
export class ApnService {
  private readonly logger = new Logger(ApnService.name);
  private provider: apn.Provider | null = null;
  private apnTopic: string = 'com.example.app'; // Default

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('apn.token.key');
    const keyId = this.configService.get<string>('apn.token.keyId');
    const teamId = this.configService.get<string>('apn.token.teamId');
    const production = this.configService.get<boolean>('apn.production');
    const topic = process.env.APN_TOPIC || 'com.example.app';
    this.apnTopic = topic;

    if (key && keyId && teamId) {
      this.provider = new apn.Provider({
        token: {
          key,
          keyId,
          teamId,
        },
        production,
      });
    } else {
      this.logger.warn(
        'APN credentials missing. APN will run in Development Mode only.',
      );
    }
  }

  async sendSingle(token: string, payload: ApnPayloadDto): Promise<boolean> {
    const isDev =
      this.configService.get<string>('environment') === 'development';
    if (isDev) {
      this.logger.log(
        `[Dev Mode] Sending APN token=${token}, payload=${JSON.stringify(payload)}`,
      );
      return true;
    }

    if (!this.provider) {
      this.logger.error('Cannot send APN: Provider not initialized');
      return false;
    }

    try {
      const note = new apn.Notification();
      note.alert = {
        title: payload.title,
        body: payload.body,
      };
      if (payload.sound) note.sound = payload.sound;
      if (payload.badge !== undefined) note.badge = payload.badge;
      if (payload.custom_data) note.payload = payload.custom_data;
      note.topic = this.apnTopic;

      const result = await this.provider.send(note, token);

      if (result.failed.length > 0) {
        this.logger.error(
          `Failed to send APN to ${token}: ${JSON.stringify(result.failed)}`,
        );
        return false;
      }
      this.logger.log(`Successfully sent APN to ${token}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send APN to ${token}`, error.stack);
      return false;
    }
  }

  async sendBatch(
    tokens: string[],
    payload: ApnPayloadDto,
  ): Promise<{ successCount: number; failureCount: number }> {
    const isDev =
      this.configService.get<string>('environment') === 'development';
    if (isDev) {
      this.logger.log(
        `[Dev Mode] Sending Batch APN tokens=${tokens.length}, payload=${JSON.stringify(payload)}`,
      );
      return { successCount: tokens.length, failureCount: 0 };
    }

    if (!this.provider) {
      this.logger.error('Cannot send batch APN: Provider not initialized');
      return { successCount: 0, failureCount: tokens.length };
    }

    try {
      const note = new apn.Notification();
      note.alert = {
        title: payload.title,
        body: payload.body,
      };
      if (payload.sound) note.sound = payload.sound;
      if (payload.badge !== undefined) note.badge = payload.badge;
      if (payload.custom_data) note.payload = payload.custom_data;
      note.topic = this.apnTopic;

      const result = await this.provider.send(note, tokens);
      this.logger.log(
        `Batch APN result: ${result.sent.length} success, ${result.failed.length} failed`,
      );
      return {
        successCount: result.sent.length,
        failureCount: result.failed.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send batch APN`, error.stack);
      return { successCount: 0, failureCount: tokens.length };
    }
  }
}
