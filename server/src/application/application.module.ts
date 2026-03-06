import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetUserProfileHandler } from './queries/get-user-profile.query';
import { GetAdminUserStatsHandler } from './queries/get-admin-user-stats.query';
import { GetAdminUsersHandler } from './queries/get-admin-users.query';
import { GetAdminTransactionStatsHandler } from './queries/get-admin-transaction-stats.query';
import { GetAdminTransactionsHandler } from './queries/get-admin-transactions.query';
import { GetAdminTransactionHandler } from './queries/get-admin-transaction.query';
import { CreateUserProfileHandler } from './commands/create-user-profile.command';
import { UpdateUserProfileHandler } from './commands/update-user-profile.command';
import { SoftDeleteUserHandler } from './commands/soft-delete-user.command';
import { PermanentDeleteUserHandler } from './commands/permanent-delete-user.command';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PortalSettingsService } from './services/PortalSettingsService';

const Handlers = [
  GetUserProfileHandler,
  GetAdminUserStatsHandler,
  GetAdminUsersHandler,
  GetAdminTransactionStatsHandler,
  GetAdminTransactionsHandler,
  GetAdminTransactionHandler,
  CreateUserProfileHandler,
  UpdateUserProfileHandler,
  SoftDeleteUserHandler,
  PermanentDeleteUserHandler,
];

const Services = [PortalSettingsService];

@Module({
  imports: [CqrsModule, InfrastructureModule],
  providers: [...Handlers, ...Services],
  exports: [CqrsModule, ...Services],
})
export class ApplicationModule { }

