import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { UserController } from './controllers/user.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    ApplicationModule,
    InfrastructureModule,
  ],
  controllers: [
    UserController,
    AdminUserController,
    AuthController,
  ],
})
export class PresentationModule { }
