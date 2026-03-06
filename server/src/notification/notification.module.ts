import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import configuration from './core/config/configuration';
import { PubSubController } from './api/pubsub.controller';
import { DispatcherService } from './services/dispatcher.service';
import { FcmService } from './services/providers/fcm.service';
import { SesService } from './services/providers/ses.service';
import { ApnService } from './services/providers/apn.service';
import { PubSubPublisherService } from './services/pubsub-publisher.service';
import { NotificationEventHandlerService } from './services/event-handler.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  controllers: [NotificationController, PubSubController],
  providers: [
    DispatcherService,
    FcmService,
    SesService,
    ApnService,
    PubSubPublisherService,
    NotificationEventHandlerService,
  ],
  exports: [PubSubPublisherService],
})
export class NotificationModule { }
