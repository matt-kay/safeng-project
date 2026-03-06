import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { GetUserProfileQuery } from '../../application/queries/get-user-profile.query';
import { CreateUserProfileCommand } from '../../application/commands/create-user-profile.command';
import { UpdateUserProfileCommand } from '../../application/commands/update-user-profile.command';
import { SoftDeleteUserCommand } from '../../application/commands/soft-delete-user.command';

@Controller('')
@UseGuards(FirebaseAuthGuard)
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() uid: string) {
    return this.queryBus.execute(new GetUserProfileQuery(uid, uid));
  }

  @Get('me/profile')
  async getMeProfile(@CurrentUser() uid: string) {
    return this.queryBus.execute(new GetUserProfileQuery(uid, uid));
  }

  @Get('users/:uid')
  async getUser(
    @CurrentUser() callerUid: string,
    @Param('uid') targetUid: string,
  ) {
    return this.queryBus.execute(new GetUserProfileQuery(callerUid, targetUid));
  }

  @Post('me/profile')
  async createProfile(
    @CurrentUser() uid: string,
    @Body() body: { first_name: string; last_name: string; email?: string },
  ) {
    await this.commandBus.execute(new CreateUserProfileCommand(uid, body));
    return this.queryBus.execute(new GetUserProfileQuery(uid, uid));
  }

  @Patch('me/profile')
  async updateProfile(
    @CurrentUser() uid: string,
    @Body()
    body: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone_number?: string;
    },
  ) {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('Empty body');
    }
    await this.commandBus.execute(new UpdateUserProfileCommand(uid, uid, body));
    return this.queryBus.execute(new GetUserProfileQuery(uid, uid));
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteMe(
    @CurrentUser() uid: string,
    @Body() body: { reason?: string },
  ) {
    await this.commandBus.execute(
      new SoftDeleteUserCommand(uid, uid, body?.reason),
    );
  }
}
