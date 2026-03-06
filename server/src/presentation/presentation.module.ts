import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { UserController } from './controllers/user.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AuthController } from './controllers/auth.controller';
import { PaystackWebhookController } from './controllers/paystack-webhook.controller';
import { PaystackController } from './controllers/paystack.controller';
import { SOSController } from './controllers/sos.controller';
import { ReportController } from './controllers/report.controller';
import { MediaController } from './controllers/media.controller';

@Module({
  imports: [
    ApplicationModule,
    InfrastructureModule,
  ],
  controllers: [
    UserController,
    AdminUserController,
    AuthController,
    PaystackWebhookController,
    PaystackController,
    SOSController,
    ReportController,
    MediaController,
  ],
})
export class PresentationModule { }
