import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetUserProfileHandler } from './queries/get-user-profile.query';
import { GetAdminUserStatsHandler } from './queries/get-admin-user-stats.query';
import { GetAdminUsersHandler } from './queries/get-admin-users.query';
import { GetReportsHandler } from './queries/get-reports.query';
import { GetReportByIdHandler } from './queries/get-report-by-id.query';
import { UpdateReportHandler } from './commands/update-report.command';
import { DeleteReportHandler } from './commands/delete-report.command';
import { CreateUserProfileHandler } from './commands/create-user-profile.command';
import { CreateReportHandler } from './commands/create-report.command';
import { UpdateUserProfileHandler } from './commands/update-user-profile.command';
import { SoftDeleteUserHandler } from './commands/soft-delete-user.command';
import { PermanentDeleteUserHandler } from './commands/permanent-delete-user.command';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

const Handlers = [
  GetUserProfileHandler,
  GetAdminUserStatsHandler,
  GetAdminUsersHandler,
  GetReportsHandler,
  GetReportByIdHandler,
  UpdateReportHandler,
  DeleteReportHandler,
  CreateUserProfileHandler,
  CreateReportHandler,
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

