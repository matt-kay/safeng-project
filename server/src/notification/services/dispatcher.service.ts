import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationPayloadDto,
  NotificationChannel,
  NotificationType,
} from '../models/dto/notification.dto';
import { ApnService } from './providers/apn.service';
import { FcmService } from './providers/fcm.service';
import { SesService } from './providers/ses.service';

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    private readonly apnService: ApnService,
    private readonly fcmService: FcmService,
    private readonly sesService: SesService,
  ) {}

  async processNotification(message: NotificationPayloadDto): Promise<boolean> {
    this.logger.log(
      `Processing message ID: ${message.id} | Type: ${message.type} | Channel: ${message.channel}`,
    );

    try {
      if (message.type === NotificationType.SINGLE) {
        if (!message.recipient) {
          throw new Error('Recipient is required for single notification');
        }
        return await this.routeSingle(
          message.channel,
          message.recipient,
          message.payload,
        );
      } else if (message.type === NotificationType.BATCH) {
        if (!message.recipients || message.recipients.length === 0) {
          throw new Error('Recipients list is required for batch notification');
        }
        return await this.routeBatch(
          message.channel,
          message.recipients,
          message.payload,
        );
      } else {
        throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to process message ID: ${message.id}`,
        error.stack,
      );
      // Re-throw so the controller can return an error status, triggering a PubSub retry
      throw error;
    }
  }

  private async routeSingle(
    channel: NotificationChannel,
    recipient: string,
    payload: any,
  ): Promise<boolean> {
    switch (channel) {
      case NotificationChannel.APN:
        return await this.apnService.sendSingle(recipient, payload);
      case NotificationChannel.FCM:
        return await this.fcmService.sendSingle(recipient, payload);
      case NotificationChannel.EMAIL:
        return await this.sesService.sendSingle(recipient, payload);
      default:
        throw new Error(`Unsupported channel for single: ${channel}`);
    }
  }

  private async routeBatch(
    channel: NotificationChannel,
    recipients: string[],
    payload: any,
  ): Promise<boolean> {
    let result;
    switch (channel) {
      case NotificationChannel.APN:
        result = await this.apnService.sendBatch(recipients, payload);
        break;
      case NotificationChannel.FCM:
        // FCM limit is 500 per multicast, so chunking is required
        result = await this.chunkedBatchExec(recipients, 500, (chunk) =>
          this.fcmService.sendBatch(chunk, payload),
        );
        break;
      case NotificationChannel.EMAIL:
        // SES Limit is 50 per bulk email, but we use Promise.all right now, chunk to 50 anyway
        result = await this.chunkedBatchExec(recipients, 50, (chunk) =>
          this.sesService.sendBatch(chunk, payload),
        );
        break;
      default:
        throw new Error(`Unsupported channel for batch: ${channel}`);
    }

    if (result.failureCount > 0 && result.successCount === 0) {
      this.logger.error(
        `Batch routing failed completely for channel ${channel}`,
      );
      return false;
    }

    // If some succeeded or partially failed, acknowledge the message (true).
    // In a future enhancement, DLQ handling would be appropriate for partial failures.
    return true;
  }

  private async chunkedBatchExec(
    recipients: string[],
    chunkSize: number,
    executor: (
      chunk: string[],
    ) => Promise<{ successCount: number; failureCount: number }>,
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const res = await executor(chunk);
      successCount += res.successCount;
      failureCount += res.failureCount;
    }

    return { successCount, failureCount };
  }
}
