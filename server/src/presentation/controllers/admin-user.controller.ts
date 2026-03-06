import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UpdateUserProfileCommand } from '../../application/commands/update-user-profile.command';
import { SoftDeleteUserCommand } from '../../application/commands/soft-delete-user.command';
import { PermanentDeleteUserCommand } from '../../application/commands/permanent-delete-user.command';
import { UserRole } from '../../domain/value-objects/user-role';
import { UserStatus } from '../../domain/value-objects/user-status';
import { GetUserProfileQuery } from '../../application/queries/get-user-profile.query';
import { GetAdminUserStatsQuery } from '../../application/queries/get-admin-user-stats.query';
import { GetAdminUsersQuery } from '../../application/queries/get-admin-users.query';
import type { TrendPeriod } from '../../application/queries/get-admin-user-stats.query';
import { FirebaseAdminProvider } from '../../infrastructure/repositories/firebase-admin.provider';

@Controller('admin/users')
@UseGuards(FirebaseAuthGuard)
export class AdminUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly firebaseProvider: FirebaseAdminProvider,
  ) { }

  @Get('stats')
  async getUserStats(
    @CurrentUser() callerUid: string,
    @Query('period') period: TrendPeriod = 'month',
  ) {
    return this.queryBus.execute(
      new GetAdminUserStatsQuery(callerUid, period),
    );
  }

  @Get()
  async listUsers(
    @CurrentUser() callerUid: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('filterType') filterType?: 'role' | 'status',
    @Query('filterValue') filterValue?: string,
    @Query('search') search?: string,
  ) {
    return this.queryBus.execute(
      new GetAdminUsersQuery(
        callerUid,
        Number(page),
        Number(limit),
        filterType,
        filterValue,
        search,
      ),
    );
  }

  @Patch(':uid')
  async updateUser(
    @CurrentUser() callerUid: string,
    @Param('uid') targetUid: string,
    @Body()
    body: {
      first_name?: string;
      last_name?: string;
      disabled?: boolean;
      role?: UserRole;
      status?: UserStatus;
    },
  ) {
    await this.commandBus.execute(
      new UpdateUserProfileCommand(callerUid, targetUid, body),
    );
    return this.queryBus.execute(new GetUserProfileQuery(callerUid, targetUid));
  }

  @Delete(':uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteUser(
    @CurrentUser() callerUid: string,
    @Param('uid') targetUid: string,
    @Body() body: { reason?: string },
  ) {
    await this.commandBus.execute(
      new SoftDeleteUserCommand(callerUid, targetUid, body?.reason),
    );
  }

  @Delete(':uid/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async permanentDeleteUser(
    @CurrentUser() callerUid: string,
    @Param('uid') targetUid: string,
    @Body() body: { reason?: string; also_delete_profile?: boolean },
  ) {
    const override = body?.also_delete_profile ?? true;
    await this.commandBus.execute(
      new PermanentDeleteUserCommand(
        callerUid,
        targetUid,
        body?.reason,
        override,
      ),
    );
  }

  @Get(':uid')
  async getUser(
    @CurrentUser() callerUid: string,
    @Param('uid') targetUid: string,
  ) {
    return this.queryBus.execute(new GetUserProfileQuery(callerUid, targetUid));
  }

  @Post(':uid/revoke-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeTokens(
    @CurrentUser() callerUid: string,
    @Param('uid') targetUid: string,
  ) {
    await this.queryBus.execute(new GetUserProfileQuery(callerUid, targetUid));
    await this.firebaseProvider.revokeRefreshTokens(targetUid);
  }
}
