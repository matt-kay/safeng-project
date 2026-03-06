import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetUserProfileHandler } from './queries/get-user-profile.query';
import { GetAdminUserStatsHandler } from './queries/get-admin-user-stats.query';
import { GetAdminUsersHandler } from './queries/get-admin-users.query';
import { CreateUserProfileHandler } from './commands/create-user-profile.command';
import { UpdateUserProfileHandler } from './commands/update-user-profile.command';
import { SoftDeleteUserHandler } from './commands/soft-delete-user.command';
import { PermanentDeleteUserHandler } from './commands/permanent-delete-user.command';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

const Handlers = [
  GetUserProfileHandler,
  GetAdminUserStatsHandler,
  GetAdminUsersHandler,
  CreateUserProfileHandler,
  UpdateUserProfileHandler,
  SoftDeleteUserHandler,
  PermanentDeleteUserHandler,
];

@Module({
  imports: [CqrsModule, InfrastructureModule],
  providers: [...Handlers],
  exports: [CqrsModule],
})
export class ApplicationModule { }

