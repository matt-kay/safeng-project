import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { DispatcherService } from '../services/dispatcher.service';
import { NotificationPayloadDto } from '../models/dto/notification.dto';
import { PubSubGuard } from '../core/guards/pubsub.guard';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationEventHandlerService } from '../services/event-handler.service';
import { NotificationEventDto } from '../models/dto/notification-event.dto';

interface PubSubMessage {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

@Controller('pubsub/notifications')
@UseGuards(PubSubGuard)
export class PubSubController {
  private readonly logger = new Logger(PubSubController.name);

  constructor(
    private readonly dispatcherService: DispatcherService,
    private readonly eventHandlerService: NotificationEventHandlerService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePubSubPush(@Body() body: PubSubMessage) {
    if (!body || !body.message || !body.message.data) {
      this.logger.error('Invalid Pub/Sub payload structure');
      return; // Return 200/204 to ack and drop invalid messages, stopping infinite retries
    }

    try {
      const jsonString = Buffer.from(body.message.data, 'base64').toString(
        'utf-8',
      );
      const payloadObj = JSON.parse(jsonString);

      // Check if it's an event-based payload or a direct notification payload
      if (payloadObj.eventType) {
        // It's a NotificationEventDto
        const event = payloadObj as NotificationEventDto;
        await this.eventHandlerService.handleEvent(event);
      } else {
        // It's a direct NotificationPayloadDto
        const dto = plainToInstance(NotificationPayloadDto, payloadObj);
        const errors = await validate(dto);

        if (errors.length > 0) {
          this.logger.error(
            `Validation failed for message ${body.message.messageId}: ${JSON.stringify(errors)}`,
          );
          return; // Return 200/204 to ack and drop invalid schema messages
        }

        await this.dispatcherService.processNotification(dto);
      }

      return; // 200 OK
    } catch (error: any) {
      this.logger.error('Error processing Pub/Sub message', error.stack);
      // Let it throw to return 500, which tells Pub/Sub to retry this request later
      throw error;
    }
  }
}
